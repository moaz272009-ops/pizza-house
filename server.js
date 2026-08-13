const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data", "db.json");
const PUBLIC = path.join(__dirname, "public");

function readDB() { return JSON.parse(fs.readFileSync(DB, "utf8")); }
function writeDB(data) { fs.writeFileSync(DB, JSON.stringify(data, null, 2)); }

function send(res, status, data, type="application/json") {
  res.writeHead(status, {"Content-Type": type});
  res.end(type === "application/json" ? JSON.stringify(data) : data);
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", c => raw += c);
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch(e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url);

  try {
    if (pathname === "/api/pizzas" && req.method === "GET")
      return send(res, 200, readDB().pizzas);

    if (pathname === "/api/pizzas" && req.method === "POST") {
      const data = await getBody(req);
      if (!data.name || !data.price) return send(res, 400, {error:"Name and price required"});

      const db = readDB();
      const id = db.pizzas.length ? Math.max(...db.pizzas.map(p => p.id)) + 1 : 1;
      const pizza = {
        id,
        name: String(data.name),
        price: Number(data.price),
        image: String(data.image || ""),
        description: String(data.description || "")
      };
      db.pizzas.push(pizza);
      writeDB(db);
      return send(res, 201, pizza);
    }

    if (pathname.startsWith("/api/pizzas/") && req.method === "DELETE") {
      const id = Number(pathname.split("/").pop());
      const db = readDB();
      db.pizzas = db.pizzas.filter(p => p.id !== id);
      writeDB(db);
      return send(res, 200, {success:true});
    }

    if (pathname.startsWith("/api/pizzas/") && req.method === "PUT") {
      const id = Number(pathname.split("/").pop());
      const data = await getBody(req);
      const db = readDB();
      const pizza = db.pizzas.find(p => p.id === id);
      if (!pizza) return send(res, 404, {error:"Pizza not found"});

      if (data.name !== undefined) pizza.name = String(data.name);
      if (data.price !== undefined) pizza.price = Number(data.price);
      if (data.image !== undefined) pizza.image = String(data.image);
      if (data.description !== undefined) pizza.description = String(data.description);

      writeDB(db);
      return send(res, 200, pizza);
    }

    if (pathname === "/" || pathname === "/index.html")
      return send(res, 200, fs.readFileSync(path.join(PUBLIC, "index.html")), "text/html");

    if (pathname === "/admin")
      return send(res, 200, fs.readFileSync(path.join(PUBLIC, "admin.html")), "text/html");

    send(res, 404, "Not found", "text/plain");
  } catch (e) {
    console.error(e);
    send(res, 500, {error:"Server error"});
  }
});

server.listen(PORT, "0.0.0.0", () => console.log("Pizza House running on port " + PORT));
