const express = require('express');
const router = express.Router();
const { pool } = require('../app');

async function getRecipeById(id) {
  try {
    const recipe = await pool.query('SELECT * FROM recipes WHERE RecetaID = $1', [id]);
    return recipe.rows[0];
  } catch (error) {
    console.error('Error al obtener la receta:', error);
    throw error;
  }
}

async function getUserById(id) {
  try {
    const user = await pool.query('SELECT * FROM users WHERE UsuarioID = $1', [id]);
    return user.rows[0];
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    throw error;
  }
}

router.get('/', (req, res) => {
  res.render('layouts/index', {layout: false});
});

router.get('/user_profile', async (req, res) => {
  const { nombre, telefono } = req.session;
  
  try {
    const user = await pool.query('SELECT * FROM users WHERE Nombre = $1 AND Telefono = $2', [nombre, telefono]);

    if (user.rows.length) {
      const result = await pool.query('SELECT * FROM recipes WHERE UsuarioID = $1', [user.rows[0].usuarioid]);
      const recipes = result.rows;

      for (let recipe of recipes) {
        const ingredient = await pool.query('SELECT Nombre FROM ingredients WHERE IngredientesID = $1', [recipe.ingredientesid]);
        const category = await pool.query('SELECT Tipo FROM categories WHERE CategoriaID = $1', [recipe.categoriaid]);
        
        recipe.ingredientes = ingredient.rows[0].nombre;
        recipe.categoria = category.rows[0].tipo;
      }

      const favoriteResult = await pool.query('SELECT * FROM user_favorites JOIN recipes ON user_favorites.recipe_id = recipes.RecetaID WHERE user_id = $1', [user.rows[0].usuarioid]);
      const favorites = favoriteResult.rows;

      for (let favorite of favorites) {
        const ingredient = await pool.query('SELECT Nombre FROM ingredients WHERE IngredientesID = $1', [favorite.ingredientesid]);
        const category = await pool.query('SELECT Tipo FROM categories WHERE CategoriaID = $1', [favorite.categoriaid]);
        
        favorite.ingredientes = ingredient.rows[0].nombre;
        favorite.categoria = category.rows[0].tipo;
      }

      res.render('layouts/user_profile', { user: user.rows[0], recipes: recipes, favorites: favorites, layout: false});
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Hubo un error al verificar el usuario');
  }
});

router.get('/recipe', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recipes');
    const recipes = result.rows;

    for (let recipe of recipes) {
      const ingredient = await pool.query('SELECT Nombre FROM ingredients WHERE IngredientesID = $1', [recipe.ingredientesid]);
      const category = await pool.query('SELECT Tipo FROM categories WHERE CategoriaID = $1', [recipe.categoriaid]);
      
      recipe.ingredientes = ingredient.rows[0].nombre;
      recipe.categoria = category.rows[0].tipo;
    }

    res.render('layouts/recipe', { recipes, layout: false });
  } catch (error) {
    console.error('Error al obtener las recetas:', error);
    res.status(500).send('Hubo un error al obtener las recetas');
  }
});

router.get('/favorite', async (req, res) => {
  const UsuarioID = req.session.UsuarioID;
  const RecetaID = req.query.recipeId;

  if (!UsuarioID) {
    console.error('Error: El usuario no ha iniciado sesión');
    return res.send('<script>alert("Debes iniciar sesión para votar"); window.location.href = "/login";</script>');
  }

  if (RecetaID) {
    const favorite = await pool.query('SELECT * FROM user_favorites WHERE user_id = $1 AND recipe_id = $2', [UsuarioID, RecetaID]);

    if (favorite.rows.length === 0) {
      await pool.query('INSERT INTO user_favorites (user_id, recipe_id) VALUES ($1, $2)', [UsuarioID, RecetaID]);
      
      await pool.query('UPDATE recipes SET Votos = Votos + 1 WHERE RecetaID = $1', [RecetaID]);
    }
  } else {
    console.error('Error: RecetaID no existe');
  }

  res.redirect('/user_profile');
});

// Ruta para editar una receta
router.get('/edit_recipe', async (req, res) => {
  const recipeId = req.query.recipeId;
  const recipe = await getRecipeById(recipeId);
  
  // Obtén las categorías e ingredientes disponibles
  const categories = await pool.query('SELECT * FROM categories');
  const ingredients = await pool.query('SELECT * FROM ingredients');

  // Pasa las categorías e ingredientes a la vista junto con la receta
  res.render('layouts/edit_recipe', { recipe, categories: categories.rows, ingredients: ingredients.rows, layout: false });
});


router.post('/update_recipe', async (req, res) => {
  const { id, nombre, ingredientes, categoria, pasos, tiempo } = req.body;
  try {
    await pool.query('UPDATE recipes SET nombre = $1, IngredientesID = $2, CategoriaID = $3, pasos = $4, tiempo = $5 WHERE RecetaID = $6', [nombre, ingredientes, categoria, pasos, tiempo, id]);
    res.redirect('/user_profile');
  } catch (error) {
    console.error('Error al actualizar la receta:', error);
    res.status(500).send('Hubo un error al actualizar la receta');
  }
});

// Ruta para eliminar una receta
router.get('/delete_recipe', async (req, res) => {
  const recipeId = req.query.recipeId;
  try {
    // Primero, elimina las referencias a la receta en la tabla 'user_favorites'
    await pool.query('DELETE FROM user_favorites WHERE recipe_id = $1', [recipeId]);

    // Luego, elimina la receta
    await pool.query('DELETE FROM recipes WHERE RecetaID = $1', [recipeId]);

    res.redirect('/user_profile');
  } catch (error) {
    console.error('Error al eliminar la receta:', error);
    res.status(500).send('Hubo un error al eliminar la receta');
  }
});

// Ruta para eliminar una receta de las favoritas
router.get('/remove_favorite', async (req, res) => {
  const UsuarioID = req.session.UsuarioID;
  const RecetaID = req.query.recipeId;

  // Comprueba si RecetaID existe antes de realizar la consulta
  if (RecetaID) {
    const favorite = await pool.query('SELECT * FROM user_favorites WHERE user_id = $1 AND recipe_id = $2', [UsuarioID, RecetaID]);

    if (favorite.rows.length > 0) {
      // Elimina la receta de los favoritos
      await pool.query('DELETE FROM user_favorites WHERE user_id = $1 AND recipe_id = $2', [UsuarioID, RecetaID]);

      // Decrementa el conteo de votos en la tabla recipes
      await pool.query('UPDATE recipes SET Votos = Votos - 1 WHERE RecetaID = $1', [RecetaID]);
    }
  } else {
    console.error('Error: RecetaID no existe');
  }

  res.redirect('/user_profile');
});

router.get('/edit_user', async (req, res) => {
  const userId = req.query.userId;
  const user = await getUserById(userId);
  
  res.render('layouts/edit_user', { user, layout: false });
});

router.post('/update_user', async (req, res) => {
  const { id, nombre, telefono, email } = req.body;
  try {
    await pool.query('UPDATE users SET nombre = $1, telefono = $2, email = $3 WHERE UsuarioID = $4', [nombre, telefono, email, id]);
    res.redirect('/user_profile');
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    res.status(500).send('Hubo un error al actualizar el usuario');
  }
});

router.post('/delete_user', async (req, res) => {
  const userId = req.session.UsuarioID;
  try {
    await pool.query('DELETE FROM user_favorites WHERE recipe_id IN (SELECT RecetaID FROM recipes WHERE UsuarioID = $1)', [userId]);
    await pool.query('DELETE FROM recipes WHERE UsuarioID = $1', [userId]);
    await pool.query('DELETE FROM users WHERE UsuarioID = $1', [userId]);
    req.session.destroy();
    res.redirect('/login');
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    res.status(500).send('Hubo un error al eliminar el usuario');
  }
});



module.exports = router;
