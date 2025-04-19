//jshint esversion:6
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import passport from "passport";
import { Strategy } from "passport-google-oauth20";
import session from "express-session";

dotenv.config();

const db = new pg.Client({
	user: "postgres",
	host: "localhost",
	database: "authentication",
	password: "Am74108520$",
	port: "5432",
});
db.connect();

passport.use(
	new Strategy(
		{
			clientID: process.env.CLIENT_ID,
			clientSecret: process.env.CLIENT_SECRET,
			callbackURL: "http://localhost:3000/auth/google/secrets",
		},
		async function (accessToken, refreshToken, profile, done) {
			try {
				// Check if user exists in the database
				const result = await db.query(
					"SELECT * FROM users WHERE google_id = $1",
					[profile.id]
				);

				if (result.rows.length > 0) {
					// User exists, pass the user object
					return done(null, result.rows[0]);
				} else {
					// User does not exist, create a new user
					const newUser = await db.query(
						"INSERT INTO users (google_id, email, name) VALUES ($1, $2, $3) RETURNING *",
						[profile.id, profile.emails[0].value, profile.displayName]
					);
					return done(null, newUser.rows[0]);
				}
			} catch (err) {
				return done(err, null); // Pass the error if something goes wrong
			}
		}
	)
);
const app = express();

// Add session middleware
app.use(
	session({
		secret: process.env.CLIENT_ID, // Replace with a strong secret key
		resave: false, // Prevents session being saved back to the store if it wasn't modified
		saveUninitialized: false, // Prevents saving uninitialized sessions
	})
);

// Initialize Passport and use session
app.use(passport.initialize());
app.use(passport.session());
// Serialize user into the session
passport.serializeUser((user, done) => {
	done(null, user.google_id); // Use google_id (or any unique identifier) to identify the user
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {

	try {
		const result = await db.query("SELECT * FROM users WHERE google_id = $1", [
			id,
		]);
		if (result.rows.length > 0) {
			done(null, result.rows[0]); // Pass the user object to req.user
		} else {
			done(null, false); // No user found
		}
	} catch (err) {
		done(err, null); // Pass the error if something goes wrong
	}
});
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
	if (req.isAuthenticated()) {
		res.render("secrets.ejs"); // Proceed to the next middleware or route handler
	} else res.render("home.ejs");
});
app.get("/login", (req, res) => {
	res.render("login.ejs");
});
app.get("/register", (req, res) => {
	res.render("register.ejs");
});

app.get(
	"/auth/google",
	passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
	"/auth/google/secrets",
	passport.authenticate("google", { failureRedirect: "/login" }),
	function (req, res) {
		// Successful authentication, redirect home.
		res.redirect("/secrets");
	}
);

app.post("/register", async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	try {
		await db.query(
			"INSERT INTO users(email,password) VALUES($1, pgp_sym_encrypt($2, $3))",
			[username, password, process.env.SECRET]
		);
	} catch (err) {
		if (err.code == 23505) {
			console.log("Username Aleady Found In DB");
		}
	}
	res.render("secrets.ejs");
});

app.get("/secrets", async(req, res) => {
 	const id = req.user.google_id


	const users =await  db.query("SELECT secret FROM secrets WHERE google_user_id=$1", [id])
	console.log(users.rows)
	res.render("secrets.ejs", {secrets: users.rows});
});
app.post("/login", async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	const result = await db.query(
		"SELECT 1 FROM users WHERE email=$1 AND  pgp_sym_decrypt(email::bytea, $2)=$3",
		[username, process.env.SECRET, password]
	);
	if (result.rows == []) {
		console.log("username not found");
	} else {
		res.render("secrets.ejs");
	}
});

app.get("/submit", (req, res)=> {

	res.render("submit.ejs")
})

app.post("/submit", async(req, res)=> {
	const mess = req.body.secret
	const id = req.user.google_id

	 await db.query("INSERT INTO secrets (google_user_id, secret) VALUES($1, $2) RETURNING *",[id, mess])
	res.redirect("/secrets")
})
app.listen(3000, () => {
	console.log("OOOOH Yeah");
});