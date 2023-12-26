const express = require('express');
const router = express.Router();
const { pool } = require('../app');

router.get('/register', (req, res) => {
  res.render('layouts/register', { layout: false });
});

router.get('/login', (req, res) => {
    res.render('layouts/login', { layout: false });
});

router.get('/upload', async (req, res) => {
  const categories = await pool.query('SELECT * FROM categories');
  const ingredients = await pool.query('SELECT * FROM ingredients');

  res.render('layouts/upload', { categories: categories.rows, ingredients: ingredients.rows , layout: false });
});

router.post('/register', async (req, res) => {
  const { nombre, telefono, email } = req.body;

  try {
    await pool.query('INSERT INTO users (Nombre, Telefono, Email) VALUES ($1, $2, $3)', [nombre, telefono, email]);
    
    console.log(`Usuario ${nombre} registrado con éxito.
    telefono: ${telefono} y email: ${email}`);

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Hubo un error al crear el usuario');
  }
});

router.post('/login', async (req, res) => {
  const { nombre, telefono } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE Nombre = $1 AND Telefono = $2', [nombre, telefono]);

    if (!user.rows.length) {
      return res.status(400).send('El nombre o teléfono ingresado no está registrado');
    }

    // Guarda la información del usuario en la sesión
    req.session.nombre = nombre;
    req.session.telefono = telefono;
    req.session.UsuarioID = user.rows[0].usuarioid;

    console.log(`UsuarioID guardado en la sesión: ${req.session.UsuarioID}`);

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Hubo un error al iniciar sesión');
  }
});

router.post('/upload', async (req, res) => {
  try {
    const { nombre, ingredientes, categoria, pasos, tiempo } = req.body;
    const UsuarioID = req.session.UsuarioID;

    await pool.query('INSERT INTO recipes (UsuarioID, Nombre, IngredientesID, CategoriaID, Pasos, Tiempo) VALUES ($1, $2, $3, $4, $5, $6)', [UsuarioID, nombre, ingredientes, categoria, pasos, tiempo]);

    res.redirect('/user_profile');
  } catch (error) {
    console.error(error);
    res.status(500).send('Hubo un error al subir la receta');
  }
});

module.exports = router;
