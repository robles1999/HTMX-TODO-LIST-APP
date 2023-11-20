import express from 'express';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import handlebars from 'handlebars';

const app = express();
const PORT = 3000;

/**
 * Handlebars setup
 */
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', [`${dirname(fileURLToPath(import.meta.url))}/views`]);

app.use(express.urlencoded({ extended: false }));
app.use(express.static(`${dirname(fileURLToPath(import.meta.url))}/public`));

/**
 * Routes
 */
app.get('/', (req, res) => {
    res.render('index');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});