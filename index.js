const { app } = require("./app");
const userRouter = require('./routes/user');
const mainRouter = require('./routes/main');

const port = 3001;

app.use((req, res, next) => {
    console.log(`Received ${req.method} request for ${req.url}`);
    next();
  })

app.use(userRouter);
app.use(mainRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});