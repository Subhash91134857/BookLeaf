const { query } = require('../config/db');

module.exports = {
    listByAuthor: async (authorId) => (await query('SELECT * FROM books WHERE author_id = $1 ORDER BY book_id', [authorId])).rows,
    listAll: async () => (await query('SELECT * FROM books ORDER BY book_id')).rows,
    findForAuthor: async (authorId, bookId) => (await query('SELECT * FROM books WHERE author_id = $1 AND book_id = $2', [authorId, bookId])).rows[0],
    findById: async (bookId) => (await query('SELECT * FROM books WHERE book_id = $1', [bookId])).rows[0],
};
