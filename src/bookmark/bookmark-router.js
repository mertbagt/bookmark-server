const express = require('express')
const { v4:uuid }= require('uuid')
const { isWebUri } = require('valid-url')
const logger = require('../logger')
const { bookmarks } = require('../store')
const BookmarksService = require('./bookmarks-service')

const bookmarkRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: bookmark.title,
  url: bookmark.url,
  description: bookmark.description,
  rating: Number(bookmark.rating),
//  rating: bookmark.rating,
})

bookmarkRouter
  .route('/')
  .get((req, res) => {
    res.send('Hello, world!')
  })

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark))
      })
      .catch(next)
  })
  .post(bodyParser, (req, res) => {
    const { title, url, description, rating } = req.body;
      
    if (!title) {
      logger.error(`Title is required`);
      return res
        .status(400)
        .send('Invalid data');
    }
        
    if (!url) {
      logger.error(`URL is required`);
      return res
        .status(400)
        .send('Invalid data');
    }

    if (!description) {
      logger.error(`Description is required`);
      return res
        .status(400)
        .send('Invalid data');
    }

    if (!rating) {
      logger.error(`Rating is required`);
      return res
        .status(400)
        .send('Invalid data');
    }
/* 
    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Rating must be between 0 and 5`)
      return res
        .status(400)
        .send(`Invalid data`)
    }
*/
    if (!isWebUri(url)) {
        logger.error(`Invalid url submitted`)
        return res
          .status(400)
          .send(`Invalid data`)
    }

    // get an id
    const id = uuid();
    
    const bookmark = {
      id,
      title,
      url,
      description,
      rating
    };
      
    bookmarks.push(bookmark);
      
    logger.info(`Bookmark with id ${id} created`);
      
    res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${id}`)
      .json(bookmark);
  });

bookmarkRouter
  .route('/bookmarks/:bookmark_id')
  .get((req, res, next) => {
    const { bookmark_id } = req.params;
    const knexInstance = req.app.get('db')
    BookmarksService.getById(knexInstance, bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark doesn't exist` }
          })
        }
        res.json(serializeBookmark(bookmark))
      })
      .catch(next)
  })
  .delete((req, res) => {
    const { id } = req.params;

    const bookmarkIndex = bookmarks.findIndex(b => b.id == id);

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${id} not found.`);
      return res
        .status(404)
        .send('Not found')
    }

    bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id ${id} deleted.`);

    res
      .status(204)
      .end();
  });

module.exports = bookmarkRouter