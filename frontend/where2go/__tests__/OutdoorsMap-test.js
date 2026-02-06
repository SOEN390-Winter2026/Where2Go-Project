import { render } from '@testing-library/react-native';
import SideLeftBar from '../src/SideLeftBar.js';

// Jest:
// Used for testing (1) UI Components, (2) User interactions, (3) Visual Logic

it('Render the application', () => {
    render(<SideLeftBar />);
});