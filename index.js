import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';
import { engine } from 'express-handlebars';
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

handlebars.registerHelper("ifEqual", function (arg1, arg2, options) {
    return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});


// compiled handlebars partials
const todoInput = handlebars.compile(readFileSync(`${__dirname}/views/partials/todo-input.handlebars`, "utf-8"));
const todoItem = handlebars.compile(readFileSync(`${__dirname}/views/partials/todo-item.handlebars`, "utf-8"));
const filterBtns = handlebars.compile(readFileSync(`${__dirname}/views/partials/filter-btns.handlebars`, "utf-8"));
// const todoItemEdit = handlebars.compile(readFileSync(`${__dirname}/views/partials/todo-item-edit.handlebars`, "utf-8"));

const FILTER_MAP = {
    All: () => true,
    Active: (todo) => !todo.completed,
    Completed: (todo) => todo.completed,
};

const FILTER_NAMES = Object.keys(FILTER_MAP);
/**
 * Routes
 */
app.get('/', (req, res) => {
    const { todos } = db.data;
    const selectedFilter = req.query.filter ?? 'All';
    const filteredTodos = todos.filter(FILTER_MAP[selectedFilter]);
    res.render('index', {
        partials: { todoInput, todoItem, filterBtns },
        todos: filteredTodos,
        filters: FILTER_NAMES.map((filterName) => ({
            filterName,
            count: todos.filter(FILTER_MAP[filterName]).length,
        })),
        selectedFilter
    });
});

/////////// ADD NEW TODO ///////////
app.post('/todos', async (req, res) => {
    const { todo, filter: selectedFilter = "All" } = req.body;

    // New todo item object
    const newTodo = {
        id: uuid(),
        completed: false,
        name: todo
    };

    // Add the new todo to the database
    db.data.todos.push(newTodo);

    // To save the data on the database
    // we must write the data in the db
    await db.write();

    // Get the data / todo list from the db
    const { todos } = db.data;
    console.log("Todos:", todos);

    const filteredTodos = todos.filter(FILTER_MAP[selectedFilter]);
    console.log("Filtered todos:", filteredTodos);

    // Reponse to send to the frontend
    setTimeout(() => {
        res.render("index", {
            layout: false,
            partials: { todoInput, todoItem, filterBtns },
            todos: filteredTodos,
            filters: FILTER_NAMES.map((filterName) => ({
                filterName,
                count: todos.filter(FILTER_MAP[filterName]).length,
            })),
            selectedFilter
        });
    }, 2000);
});

/////////// CHECK MARK TODO AS COMPLETED ///////////
app.patch('/todos/:id', async (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    const selectedFilter = req.query.filter ?? 'All';

    const todo = db.data.todos.find(todo => todo.id === id);

    if (!todo) {
        return res.status(404).send('Todo not found.');
    }

    todo.completed = !!completed;

    await db.write();
    
    const { todos } = db.data;

    res.render("index", {
        layout: false,
        partials: { todoInput, todoItem, filterBtns },
        todos: db.data.todos,
        filters: FILTER_NAMES.map((filterName) => ({
            filterName,
            count: todos.filter(FILTER_MAP[filterName]).length,
        })),
        selectedFilter
    });
});

/////////// DELETE TODO ///////////
app.delete('/todos/:id', async (req, res) => {
    const { id } = req.params;
    const selectedFilter = req.query.filter ?? "All";
    const idx = db.data.todos.findIndex(todo => todo.id === id);
    if (idx !== -1) {
        db.data.todos.splice(idx, 1);
        await db.write();
    }
    return res.render("partials/filter-btns", {
        layout: false,
        filters: FILTER_NAMES.map((filterName) => ({
            filterName,
            count: db.data.todos.filter(FILTER_MAP[filterName]).length,
        })),
        selectedFilter
    });
});

/////////// SHOW THE EDIT FORM ///////////
app.get('/todos/:id/edit', (req, res) => {
    const { id } = req.params;
    const selectedFilter = req.query.filter ?? "All";
    const todo = db.data.todos.find(todo => todo.id === id);
    if (!todo) {
        return res.status(404).send('Todo not found.');
    }
    return res.render('partials/todo-item-edit',
        {
            layout: false,
            ...todo,
            selectedFilter,
        });
});

/////////// GET A SINGLE TODO BY ID ///////////
app.get('/todos/:id', (req, res) => {
    const { id } = req.params;
    const selectedFilter = req.query.filter ?? "All";

    const todo = db.data.todos.find(todo => todo.id === id);
    if (!todo) {
        return res.status(404).send('Todo not found.');
    }
    return res.render('partials/todo-item',
        {
            layout: false,
            ...todo,
            selectedFilter
        });
});

/////////// CHANGE THE TODO ITEM TITLE/DESCTIPTION ///////////
app.put('/todos/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const todo = db.data.todos.find(todo => todo.id === id);
    if (!todo) {
        return res.status(404).send('Todo not found.');
    }
    todo.name = name;
    await db.write();

    return res.render('partials/todo-item', { layout: false, ...todo });
});


/////////// SERVER RUNNING MESSAGE ///////////
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});