import SideLeftBar from '../src/SideLeftBar';

// Jest:
// Used for testing (1) UI Components, (2) User interactions, (3) Visual Logic

test('SideLeftBar imports without crashing', () => {
    expect(SideLeftBar).toBeDefined();
});