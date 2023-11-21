import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuid } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, "db.json");

const app = express();
const PORT = 3000;

/**
 * Handlebars setup
 */
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', [`${__dirname}/views`]);

app.use(express.urlencoded({ extended: false }));
app.use(express.static(`${__dirname}/public`));
const adapter = new JSONFile(file);
const defaultData = {
    todos: [],
};
const db = new Low(adapter, defaultData);
await db.read();
const todoInput = handlebars.compile(readFileSync(`${__dirname}/views/partials/todo-input.handlebars`, "utf-8"));
const todoItem = handlebars.compile(readFileSync(`${__dirname}/views/partials/todo-item.handlebars`, "utf-8"));

/**
 * Routes
 */
app.get('/', async (req, res) => {
    const { todos } = db.data;
    res.render('index', { partials: { todoInput, todoItem }, todos });
});

app.post('/todos', async (req, res) => {
    const { todo } = req.body;
    const newTodo = { id: uuid(), completed: false, name: todo };
    db.data.todos.push(newTodo);
    await db.write();
    const { todos } = db.data;
    res.render("index", { layout: false, partials: { todoInput, todoItem }, todos });
    // setTimeout(() => {
    // }, 2000);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});