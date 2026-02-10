
import { Container } from '@mui/material';
import { CreateRemitoForm } from '../features/remitos/ui/CreateRemitoForm';

export const CreateRemitoPage = () => {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <CreateRemitoForm />
        </Container>
    );
};
