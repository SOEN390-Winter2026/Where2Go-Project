import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingPage from '../src/LoadingPage';

describe('LoadingPage', () => {

  it('renders the loading page without crashing', () => {
    const { toJSON } = render(<LoadingPage />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the loading page logo image', () => {
    const { getByTestId } = render(<LoadingPage />);
    const logo = getByTestId('loadingLogo');
    expect(logo).toBeTruthy();
  });

  it('renders the loading page activity indicator', () => {
    const { getByTestId } = render(<LoadingPage />);
    const spinner = getByTestId('loadingSpin');
    expect(spinner).toBeTruthy();
  });

});
