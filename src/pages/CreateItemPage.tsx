import { Container } from '@mui/material';
import { CreateItemForm } from '../features/create-item';

export const CreateItemPage = () => {
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <CreateItemForm />
        </Container>
    );
};
