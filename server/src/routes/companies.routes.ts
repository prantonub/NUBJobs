import { Router } from 'express';
import { listPublicCompanies, getPublicCompany } from '../controllers/company-profile.controller';

const router = Router();

// Public — no authentication required
router.get('/', listPublicCompanies);
router.get('/:id', getPublicCompany);

export default router;
