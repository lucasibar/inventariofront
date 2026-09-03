import { Box, Chip, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import LinkIcon from '@mui/icons-material/Link';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import type { SvgIconComponent } from '@mui/icons-material';

type Palette = {
    primary: string;
    cardBg: string;
    border: string;
    textDim: string;
    danger: string;
    success: string;
    info: string;
    warning: string;
};

type PurchaseStats = {
    openKg?: number;
    dueNext7DaysCount?: number;
    withoutExpectedDateCount?: number;
    onTimeDeliveryPct?: number | null;
    avgDeliveryDays?: number | null;
};

type Metrics = { critical: number; unlinked: number; pending: number; delayed: number };

const KpiButton = ({ label, value, Icon, color, active, onClick, palette }: {
    label: string;
    value: number;
    Icon: SvgIconComponent;
    color: string;
    active: boolean;
    onClick: () => void;
    palette: Palette;
}) => (
    <Box onClick={onClick} sx={{
        flex: '1 1 0', minWidth: 90, height: 75, p: 1.5, borderRadius: 3,
        bgcolor: active ? `${color}25` : palette.cardBg, border: '1px solid', borderColor: active ? color : palette.border,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative',
    }}>
        <Box sx={{ color, mb: 0.5, opacity: active ? 1 : 0.6 }}><Icon sx={{ fontSize: '1.1rem' }} /></Box>
        <Typography sx={{ color: active ? 'var(--text-white-dynamic, #fff)' : color, fontWeight: 900, mb: 0.1, lineHeight: 1, fontSize: '1.1rem' }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: active ? 'var(--text-white-dynamic, #fff)' : palette.textDim, fontSize: '0.5rem', fontWeight: 800, textAlign: 'center', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
        {active && <Box sx={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 3, bgcolor: color, borderRadius: '2px 2px 0 0' }} />}
    </Box>
);

export function PurchaseExecutiveSummary({ stats, metrics, activeTab, onTabChange, palette }: {
    stats?: PurchaseStats;
    metrics: Metrics;
    activeTab: number;
    onTabChange: (tab: number) => void;
    palette: Palette;
}) {
    const summary = [
        { label: `${Number(stats?.openKg ?? 0).toLocaleString('es-AR')} kg pendientes`, color: palette.primary },
        { label: `${stats?.dueNext7DaysCount ?? 0} entregas en 7 días`, color: palette.info },
        { label: `${stats?.withoutExpectedDateCount ?? 0} sin fecha comprometida`, color: palette.warning },
        { label: `Entrega a tiempo: ${stats?.onTimeDeliveryPct == null ? 's/d' : `${stats.onTimeDeliveryPct}%`}`, color: palette.success },
        { label: `Plazo real: ${stats?.avgDeliveryDays == null ? 's/d' : `${stats.avgDeliveryDays} días`}`, color: palette.primary },
    ];
    if (metrics.delayed > 0) summary.push({ label: `${metrics.delayed} demoradas`, color: palette.warning });

    return <>
        <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 1, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
            {summary.map((item) => <Chip key={item.label} label={item.label} size="small" sx={{ bgcolor: `${item.color}15`, color: item.color, fontWeight: 800, fontSize: '0.65rem' }} />)}
        </Box>
        <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1, p: 1.5, pt: 0, '&::-webkit-scrollbar': { display: 'none' } }}>
            <KpiButton label="Críticos" value={metrics.critical} Icon={NotificationsActiveIcon} color={palette.danger} active={activeTab === 2} onClick={() => onTabChange(2)} palette={palette} />
            <KpiButton label="Por Conciliar" value={metrics.unlinked} Icon={LinkIcon} color={palette.warning} active={activeTab === 1} onClick={() => onTabChange(1)} palette={palette} />
            <KpiButton label="En Curso" value={metrics.pending} Icon={AssignmentIcon} color={palette.primary} active={activeTab === 0} onClick={() => onTabChange(0)} palette={palette} />
            <KpiButton label="Demoras" value={metrics.delayed} Icon={HistoryIcon} color={palette.danger} active={activeTab === 3} onClick={() => onTabChange(3)} palette={palette} />
        </Box>
    </>;
}
