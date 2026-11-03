import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';
import { register } from '../services/api';

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal()),
  register: vi.fn(),
}));

describe("page d'inscription", () => {
  test("affiche l'erreur du serveur dans le formulaire", async () => {
    register.mockRejectedValue({
      response: { status: 409, data: { message: 'Ce nom ou cet email est déjà utilisé.' } },
    });
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText("Nom d'utilisateur"), 'alice');
    await userEvent.type(screen.getByPlaceholderText('Adresse email'), 'alice@example.com');
    await userEvent.type(screen.getByPlaceholderText('Mot de passe'), 'motdepasse123');
    await userEvent.click(screen.getByRole('button', { name: "S'inscrire" }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce nom ou cet email est déjà utilisé.');
    expect(register).toHaveBeenCalledWith({
      username: 'alice',
      email: 'alice@example.com',
      password: 'motdepasse123',
    });
  });
});
