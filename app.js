//jshint esversion:6
import dotenv from "dotenv"
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

dotenv.config()


const db = new pg.Client({
	user: "postgres",
	host: "localhost",
	database: "authentication",
	password: "Am74108520$",
	port: "5432",
});
db.connect();

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
	res.render("home.ejs");
});
app.get("/login", (req, res) => {
	res.render("login.ejs");
});
app.get("/register", (req, res) => {
	res.render("register.ejs");
});

app.post("/register", async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	console.log(username);
	try {
		await db.query("INSERT INTO users(email,password) VALUES($1, pgp_sym_encrypt($2, $3))", [
			username,
			password,
            process.env.SECRET
		]);
	} catch (err) {
		if (err.code == 23505) {
			console.log("Username Aleady Found In DB");
		}
	}
	res.render("secrets.ejs");
});
app.post("/login", async(req, res) =>{
    const username = req.body.username;
	const password = req.body.password;
   const result =  await db.query("SELECT 1 FROM users WHERE email=$1 AND  pgp_sym_decrypt(email::bytea, $2)=$3",[username,process.env.SECRET, password])
   if (result.rows == []) {
    console.log("username not found")
   }else {
    res.render("secrets.ejs")
   }
})
app.listen(3000, () => {
	console.log("OOOOH Yeah");
})

