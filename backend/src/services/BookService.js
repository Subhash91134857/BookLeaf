const books = require('../repositories/BookRepository');
const { bookView } = require('../utils/serializers');

module.exports = {
    // Authors see only their own books; admins see all.
    async list(user) {
        const rows = user.role === 'admin' ? await books.listAll() : await books.listByAuthor(user.id);
        return rows.map(bookView);
    },
};
