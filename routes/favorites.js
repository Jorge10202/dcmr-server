import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  myFavoriteIds, listMyFavorites, addFavorite, removeFavorite
} from '../controllers/favoritesController.js';

const r = Router();
r.use(requireAuth);

r.get('/ids', myFavoriteIds);       
r.get('/', listMyFavorites);          
r.post('/:productId', addFavorite);  
r.delete('/:productId', removeFavorite); 

export default r;
