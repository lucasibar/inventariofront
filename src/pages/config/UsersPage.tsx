import { useState, useMemo } from 'react';
import { 
    useGetUsersQuery, 
    useCreateUserMutation, 
    useUpdateUserMutation,
    type User
} from '../../entities/auth/api/authApi';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { PageHeader, Card, Table, Btn, Modal, Input, Badge, EditableCell } from '../../shared/ui';
import { ALL_SECTORS } from '../../shared/types/roles';

export default function UsersPage() {
    const { data: users = [], isLoading: loadingUsers } = useGetUsersQuery();
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);
    
    const [createUser] = useCreateUserMutation();
    const [updateUser] = useUpdateUserMutation();

    const [showNewUserModal, setShowNewUserModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ 
        username: '', 
        password: '', 
        role: 'SUPERVISOR',
        sectors: ['DEPOSITO'] as string[],
        allowedDepotIds: [] as string[]
    });

    const [editingDepotsFor, setEditingDepotsFor] = useState<User | null>(null);
    const [editingSectorsFor, setEditingSectorsFor] = useState<{ user: User; sectors: string[] } | null>(null);
    const [editingPasswordFor, setEditingPasswordFor] = useState<User | null>(null);
    const [newPasswordVal, setNewPasswordVal] = useState('');

    const getUserSectors = (u: User): string[] => {
        if (u.sectors && Array.isArray(u.sectors) && u.sectors.length > 0) {
            return u.sectors.map(s => s.toUpperCase());
        }
        if (u.sector) {
            return u.sector.split(/[,;|]/).map(s => s.trim().toUpperCase()).filter(Boolean);
        }
        return [];
    };

    const handleCreateSubmit = async () => {
        if (!newUserForm.username || !newUserForm.password) {
            alert('Por favor completa usuario y contraseña.');
            return;
        }
        try {
            await createUser({
                username: newUserForm.username,
                password: newUserForm.password,
                role: newUserForm.role,
                sectors: newUserForm.role === 'ADMIN' ? [] : newUserForm.sectors,
                allowedDepotIds: newUserForm.allowedDepotIds
            }).unwrap();
            setShowNewUserModal(false);
            setNewUserForm({ 
                username: '', 
                password: '', 
                role: 'SUPERVISOR', 
                sectors: ['DEPOSITO'], 
                allowedDepotIds: [] 
            });
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

    const handleUpdateSectors = async (userId: string, sectors: string[]) => {
        try {
            await updateUser({ id: userId, data: { sectors } }).unwrap();
            setEditingSectorsFor(null);
        } catch (e: any) {
            alert(e?.data?.message || 'Error al actualizar sectores');
        }
    };

    const cols = ['Usuario', 'Rol', 'Sectores Permitidos', 'Depósitos Permitidos', 'Estado', 'Acciones'];
    
    const rows = users.map(u => {
        const uSectors = getUserSectors(u);

        return [
            <div style={{ fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>
                <EditableCell 
                    value={u.username} 
                    onSave={async (v) => { await updateUser({ id: u.id, data: { username: v } }).unwrap(); }} 
                />
            </div>,
            <select 
                value={u.role} 
                onChange={(e) => handleUpdateRole(u, e.target.value)}
                style={{ 
                    background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)', color: 'var(--text-primary, #f3f4f6)', 
                    borderRadius: '6px', padding: '5px 10px', fontSize: '13px', outline: 'none', fontWeight: 600
                }}
            >
                <option value="ADMIN">ADMIN</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="OPERARIO">OPERARIO</option>
            </select>,
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px', alignItems: 'center' }}>
                {u.role === 'ADMIN' ? (
                    <Badge color="#6366f1">🌟 ACCESO TOTAL A TODOS</Badge>
                ) : (
                    <>
                        {uSectors.map(sec => {
                            const found = ALL_SECTORS.find(s => s.key === sec);
                            return (
                                <Badge key={sec} color="#3b82f6">
                                    {found ? `${found.icon} ${found.label}` : sec}
                                </Badge>
                            );
                        })}
                        {uSectors.length === 0 && (
                            <span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '12px', fontStyle: 'italic' }}>
                                Ninguno (Sin acceso a sectores)
                            </span>
                        )}
                        <button 
                            onClick={() => setEditingSectorsFor({ user: u, sectors: [...uSectors] })}
                            style={{ 
                                border: 'none', background: 'none', color: '#6366f1', fontSize: '12px', 
                                cursor: 'pointer', textDecoration: 'underline', padding: '2px 4px' 
                            }}
                        >
                            {uSectors.length > 0 ? 'Editar' : '+ Asignar'}
                        </button>
                    </>
                )}
            </div>,
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '280px', alignItems: 'center' }}>
                {u.role === 'ADMIN' ? (
                    <Badge color="#6366f1">ACCESO TOTAL</Badge>
                ) : (
                    <>
                        {u.allowedDepotIds?.map(id => {
                            const d = depots.find(depo => depo.id === id);
                            return <Badge key={id} color="var(--text-dimmed, #4b5563)">{d?.nombre || id}</Badge>;
                        })}
                        {(!u.allowedDepotIds || u.allowedDepotIds.length === 0) && (
                            <span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '12px', fontStyle: 'italic' }}>
                                Todos (Sin restricción)
                            </span>
                        )}
                        <button 
                            onClick={() => setEditingDepotsFor(u)}
                            style={{ 
                                border: 'none', background: 'none', color: '#6366f1', fontSize: '12px', 
                                cursor: 'pointer', textDecoration: 'underline', padding: '2px 4px' 
                            }}
                        >
                            {u.allowedDepotIds && u.allowedDepotIds.length > 0 ? 'Editar' : '+ Asignar'}
                        </button>
                    </>
                )}
            </div>,
            <Badge color={u.isActive !== false ? '#10b981' : '#ef4444'}>
                {u.isActive !== false ? 'ACTIVO' : 'INACTIVO'}
            </Badge>,
            <div style={{ display: 'flex', gap: '8px' }}>
                <Btn small variant="secondary" onClick={() => setEditingPasswordFor(u)}>
                    🔑 Contraseña
                </Btn>
                <Btn small variant="secondary" onClick={() => handleToggleActive(u)}>
                    {u.isActive !== false ? 'Desactivar' : 'Activar'}
                </Btn>
            </div>
        ];
    });

    return (
        <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
            <PageHeader title="Administración de Usuarios y Sesiones" subtitle="Configura cuentas, roles, permisos por sector y contraseñas">
                <Btn onClick={() => setShowNewUserModal(true)}>+ Crear Nuevo Usuario</Btn>
            </PageHeader>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
                <Table 
                    loading={loadingUsers} 
                    cols={cols} 
                    rows={rows} 
                />
                {!loadingUsers && users.length === 0 && (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-subtle, #6b7280)' }}>
                        No hay usuarios registrados.
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
                            <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '13px', marginBottom: '8px' }}>Rol</label>
                            <select 
                                value={newUserForm.role}
                                onChange={e => setNewUserForm(p => ({...p, role: e.target.value}))}
                                style={{ width: '100%', background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: 'var(--text-primary, #f3f4f6)', borderRadius: '8px', padding: '10px' }}
                            >
                                <option value="SUPERVISOR">SUPERVISOR</option>
                                <option value="OPERARIO">OPERARIO</option>
                                <option value="ADMIN">ADMIN (Acceso Total)</option>
                            </select>
                        </div>

                        {newUserForm.role !== 'ADMIN' && (
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '13px', marginBottom: '8px' }}>
                                    Sectores Permitidos
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {ALL_SECTORS.map(sec => {
                                        const isChecked = newUserForm.sectors.includes(sec.key);
                                        return (
                                            <label key={sec.key} style={{ 
                                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', 
                                                background: isChecked ? 'rgba(99,102,241,0.15)' : 'var(--bg-hover-row, rgba(255,255,255,0.03))', 
                                                borderRadius: '6px', cursor: 'pointer', border: isChecked ? '1px solid #6366f1' : '1px solid transparent'
                                            }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked}
                                                    onChange={e => {
                                                        const next = e.target.checked 
                                                            ? [...newUserForm.sectors, sec.key]
                                                            : newUserForm.sectors.filter(s => s !== sec.key);
                                                        setNewUserForm(p => ({...p, sectors: next}));
                                                    }}
                                                />
                                                <span style={{ fontSize: '13px', color: 'var(--text-primary, #f3f4f6)' }}>
                                                    {sec.icon} {sec.label}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => setShowNewUserModal(false)}>Cancelar</Btn>
                        <Btn onClick={handleCreateSubmit}>Crear Usuario</Btn>
                    </div>
                </Modal>
            )}

            {/* Modal Editar Sectores */}
            {editingSectorsFor && (
                <Modal 
                    title={`Permisos de Sector para ${editingSectorsFor.user.username}`} 
                    onClose={() => setEditingSectorsFor(null)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '13px', margin: '0 0 8px 0' }}>
                            Selecciona los sectores a los que este usuario tiene permiso de acceso y visualización:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                            {ALL_SECTORS.map(sec => {
                                const isChecked = editingSectorsFor.sectors.includes(sec.key);
                                return (
                                    <label key={sec.key} style={{ 
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', 
                                        background: isChecked ? 'rgba(99,102,241,0.18)' : 'var(--bg-hover-row, rgba(255,255,255,0.03))', 
                                        borderRadius: '8px', cursor: 'pointer', 
                                        border: isChecked ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.06)'
                                    }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const current = editingSectorsFor.sectors;
                                                const next = e.target.checked
                                                    ? [...current, sec.key]
                                                    : current.filter(s => s !== sec.key);
                                                setEditingSectorsFor({ ...editingSectorsFor, sectors: next });
                                            }}
                                        />
                                        <div>
                                            <div style={{ color: 'var(--text-primary, #f3f4f6)', fontWeight: 600, fontSize: '13px' }}>
                                                {sec.icon} {sec.label}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => setEditingSectorsFor(null)}>Cancelar</Btn>
                        <Btn onClick={() => handleUpdateSectors(editingSectorsFor.user.id, editingSectorsFor.sectors)}>
                            Guardar Sectores
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* Modal Editar Depósitos */}
            {editingDepotsFor && (
                <Modal title={`Depósitos para ${editingDepotsFor.username}`} onClose={() => setEditingDepotsFor(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', maxHeight: '400px', overflowY: 'auto' }}>
                        <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '13px', margin: '0 0 12px 0' }}>Selecciona los depósitos a los que este usuario tiene permiso de acceso:</p>
                        {depots.map(d => (
                            <label key={d.id} style={{ 
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                                background: 'var(--bg-hover-row, rgba(255,255,255,0.03))', borderRadius: '8px', cursor: 'pointer',
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
                                    <div style={{ color: 'var(--text-primary, #f3f4f6)', fontWeight: 500 }}>{d.nombre}</div>
                                    <div style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '11px' }}>{d.planta || 'Sin planta'}</div>
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

            {/* Modal Cambiar Contraseña */}
            {editingPasswordFor && (
                <Modal title={`Cambiar contraseña de ${editingPasswordFor.username}`} onClose={() => { setEditingPasswordFor(null); setNewPasswordVal(''); }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        <Input 
                            label="Nueva Contraseña" 
                            type="password"
                            value={newPasswordVal} 
                            onChange={setNewPasswordVal} 
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => { setEditingPasswordFor(null); setNewPasswordVal(''); }}>Cancelar</Btn>
                        <Btn onClick={async () => {
                            if (!newPasswordVal) {
                                alert('Por favor ingresa una contraseña.');
                                return;
                            }
                            try {
                                await updateUser({ id: editingPasswordFor.id, data: { password: newPasswordVal } }).unwrap();
                                alert('Contraseña actualizada correctamente.');
                                setEditingPasswordFor(null);
                                setNewPasswordVal('');
                            } catch (e: any) {
                                alert(e?.data?.message || 'Error al cambiar contraseña');
                            }
                        }}>Guardar Contraseña</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
