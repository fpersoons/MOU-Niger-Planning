import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : toutes les références sont relatives, car l'application est
// servie sous un préfixe de chemin par le portail ChemLink
// (https://www.chemlink.app/MOU-Niger-Planning/).
export default defineConfig({
  base: './',
  plugins: [react()],
  // ExcelJS et SheetJS sont chargés à la demande (import dynamique) : gros fichiers attendus.
  build: { chunkSizeWarningLimit: 1000 },
});
