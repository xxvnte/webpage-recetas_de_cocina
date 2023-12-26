const express = require('express');
const handlebars = require("express-handlebars");
const app = express();
const { Pool } = require('pg');
const session = require('express-session');
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'tu_secreto',
  resave: false,
  saveUninitialized: true,
}));

const hbs = handlebars.create({
    extname: "hbs",
    layoutsDir: `${__dirname}/views/layouts`,
    partialsDir: `${__dirname}/views/partials`,
    defaultLayout: "index",
    helpers: {
        eq: function(arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : '';
        }
    }
});

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'proyecto',
  password: '--------',
  port: 5432,
});

pool.connect()
  .then(() => {
    console.log('Connected to PostgreSQL Database');
  })
  .catch((error) => {
    console.error(`Connection refuse: ${error}`);
  });

  app.get('/', async (req, res) => {
    try {
        let popular = await pool.query('SELECT * FROM recipes ORDER BY votos DESC LIMIT 3');
        
        for (let recipe of popular.rows) {
            const ingredient = await pool.query('SELECT Nombre FROM ingredients WHERE IngredientesID = $1', [recipe.ingredientesid]);
            const category = await pool.query('SELECT Tipo FROM categories WHERE CategoriaID = $1', [recipe.categoriaid]);
            
            recipe.ingredientes = ingredient.rows[0].nombre;
            recipe.categoria = category.rows[0].tipo;
        }

        res.render('layouts/index', 
        { 
            popular: popular.rows,
            layout: false 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Hubo un error al obtener las recetas populares');
    }
});

module.exports = { app, pool };
