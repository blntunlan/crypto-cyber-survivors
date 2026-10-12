import ReactDOM from 'react-dom/client';
import { resolveAppSurface } from './entry/AppSurface';
import { RootEntry } from './entry/RootEntry';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(<RootEntry surface={resolveAppSurface(window.location.pathname)} />);
