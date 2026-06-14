import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./pages/EditorPage', () => () => <div>Editor page</div>);

test('renders the room join form', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
});
