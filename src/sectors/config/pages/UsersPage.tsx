import { useState } from 'react';
import { 
    useGetUsersQuery, 
    useCreateUserMutation, 
    useUpdateUserMutation,
    type User
} from '../../../entities/auth/api/authApi';
import { useGetDepotsQuery } from '../../warehouse/deposito/api/deposito.api';
import { PageHeader, Card, Table, Btn, Modal, Input, Badge } from '../../../shared/ui';

export default function UsersPage() {
    const { data: users = [], isLoading: loadingUsers } = useGetUsersQuery();
    const { data: depots = [] } = useGetDepotsQuery();
    
    const [createUser] = useCreateUserMutation();
    const [updateUser] = useUpdateUserMutation();

    const [showNewUserModal, setShowNewUserModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ 
        username: '', 
        password: '', 
        role: 'OPERATOR',
        allowedDepotIds: [] as string[]
    });

    const [editingDepotsFor, setEditingDepotsFor] = useState<User | null>(null);

    const handleCreateSubmit = async () => {
        if (!newUserForm.username || !newUserForm.password) {
            alert('Por favor completa usuario y contraseña.');
            return;
        }
        try {
            await createUser(newUserForm).unwrap();
            setShowNewUserModal(false);
            setNewUserForm({ username: '', password: '', role: 'OPERATOR', allowedDepotIds: [] });
        } catch (e: any) {
            alert(e?.data?.message || 'Error al crear usuario');
        }
    };

    const handleUpdateRole = async (user: User, newRole: string) => {
        try {
            await updateUser({ id: user.id, data: { role: newRole } }).unwrap();
        } catch (e: any) {
            alert(e?.data?.message || 'Error al actualizar rol');
        }
    };

    const handleToggleActive = async (user: User) => {
        try {
            await updateUser({ id: user.id, data: { isActive: !user.isActive } }).unwrap();
        } catch (e: any) {
            alert(e?.data?.message || 'Error al cambiar estado');
        }
    };

    const handleUpdateDepots = async (userId: string, depotIds: string[]) => {
        try {
            await updateUser({ id: userId, data: { allowedDepotIds: depotIds } }).unwrap();
        } catch (e: any) {
            alert(e?.data?.message || 'Error al actualizar depósitos');
        }
    };

    const cols = ['Usuario', 'Rol', 'Depósitos Permitidos', 'Estado', 'Acciones'];
    
    const rows = users.map(u => [
        <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{u.username}</div>,
        <select 
            value={u.role} 
            onChange={(e) => handleUpdateRole(u, e.target.value)}
            style={{ 
                background: '#1a1d2e', border: '1px solid #2a2d3e', color: '#f3f4f6', 
                borderRadius: '6px', padding: '4px 8px', fontSize: '13px', outline: 'none' 
            }}
        >
            <option value="ADMIN">ADMIN</option>
            <option value="SUPERVISOR">SUPERVISOR</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="COMPRAS">COMPRAS</option>
        </select>,
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
            {u.role === 'ADMIN' ? (
                <Badge color="#6366f1">ACCESO TOTAL</Badge>
            ) : (
                <>
                    {u.allowedDepotIds?.map(id => {
                        const d = depots.find(depo => depo.id === id);
                        return <Badge key={id} color="#4b5563">{d?.nombre || id}</Badge>;
                    })}
                    {u.allowedDepotIds?.length === 0 && <span style={{ color: '#6b7280', fontSize: '12px', fontStyle: 'italic' }}>Ninguno (Sin acceso)</span>}
                    <button 
                        onClick={() => setEditingDepotsFor(u)}
                        style={{ border: 'none', background: 'none', color: '#6366f1', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {u.allowedDepotIds?.length > 0 ? 'Editar' : '+ Asignar'}
                    </button>
                </>
            )}
        </div>,
        <Badge color={u.isActive !== false ? '#10b981' : '#ef4444'}>
            {u.isActive !== false ? 'ACTIVO' : 'INACTIVO'}
        </Badge>,
        <div style={{ display: 'flex', gap: '8px' }}>
            <Btn small variant="secondary" onClick={() => handleToggleActive(u)}>
                {u.isActive !== false ? 'Desactivar' : 'Activar'}
            </Btn>
        </div>
    ]);

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader title="Gestión de Usuarios" subtitle="Administra accesos, roles y permisos de depósitos">
                <Btn onClick={() => setShowNewUserModal(true)}>+ Crear Usuario</Btn>
            </PageHeader>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
                <Table 
                    loading={loadingUsers} 
                    cols={cols} 
                    rows={rows} 
                />
                {!loadingUsers && users.length === 0 && (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                        No hay usuarios registrados aparte del administrador inicial.
                    </div>
                )}
            </Card>

            {/* Modal Crear Usuario */}
            {showNewUserModal && (
                <Modal title="Nuevo Usuario" onClose={() => setShowNewUserModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        <Input 
                            label="Nombre de Usuario" 
                            value={newUserForm.username} 
                            onChange={v => setNewUserForm(p => ({...p, username: v}))} 
                        />
                        <Input 
                            label="Contraseña Inicial" 
                            type="password"
                            value={newUserForm.password} 
                            onChange={v => setNewUserForm(p => ({...p, password: v}))} 
                        />
                        <div>
                            <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Rol</label>
                            <select 
                                value={newUserForm.role}
                                onChange={e => setNewUserForm(p => ({...p, role: e.target.value}))}
                                style={{ width: '100%', background: '#0f1117', border: '1px solid #2a2d3e', color: '#f3f4f6', borderRadius: '8px', padding: '10px' }}
                            >
                                <option value="OPERATOR">OPERATOR</option>
                                <option value="SUPERVISOR">SUPERVISOR</option>
                                <option value="COMPRAS">COMPRAS</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => setShowNewUserModal(false)}>Cancelar</Btn>
                        <Btn onClick={handleCreateSubmit}>Crear Usuario</Btn>
                    </div>
                </Modal>
            )}

            {/* Modal Editar Depósitos */}
            {editingDepotsFor && (
                <Modal title={`Depósitos para ${editingDepotsFor.username}`} onClose={() => setEditingDepotsFor(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', maxHeight: '400px', overflowY: 'auto' }}>
                        <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 12px 0' }}>Selecciona los depósitos a los que este usuario tiene permiso de acceso:</p>
                        {depots.map(d => (
                            <label key={d.id} style={{ 
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                                background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer',
                                border: '1px solid transparent', transition: 'all 0.2s'
                            }}>
                                <input 
                                    type="checkbox" 
                                    checked={editingDepotsFor.allowedDepotIds?.includes(d.id)}
                                    onChange={(e) => {
                                        const current = editingDepotsFor.allowedDepotIds || [];
                                        const next = e.target.checked 
                                            ? [...current, d.id]
                                            : current.filter(id => id !== d.id);
                                        setEditingDepotsFor({...editingDepotsFor, allowedDepotIds: next});
                                    }}
                                />
                                <div>
                                    <div style={{ color: '#f3f4f6', fontWeight: 500 }}>{d.nombre}</div>
                                    <div style={{ color: '#6b7280', fontSize: '11px' }}>{d.planta || 'Sin planta'}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => setEditingDepotsFor(null)}>Cancelar</Btn>
                        <Btn onClick={() => {
                            handleUpdateDepots(editingDepotsFor.id, editingDepotsFor.allowedDepotIds);
                            setEditingDepotsFor(null);
                        }}>Guardar Cambios</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
