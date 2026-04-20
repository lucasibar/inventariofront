export type MachineStatus = 'SOLVED' | 'ELECTRICAL' | 'MECHANICAL' | 'SUCTION' | 'YARN_SHORTAGE';

export interface PerformanceLog {
    id: string;
    machineId: string;
    fromStatus: MachineStatus;
    toStatus: MachineStatus;
    failureType?: string;
    observation?: string;
    generatedBy: string;
    timestamp: string;
    machine?: {
        number: number;
        codigoInterno: string;
        plant?: { name: string };
    };
}

export interface MachineKPIs {
    uptime: string;
    downtime: string;
    availability: string;
    mtbf: string;
    mttr: string;
    mttf: string;
    failures: number;
    repairs: number;
    oee: string;
    history: PerformanceLog[];
}

export const calculateKPIs = (logs: PerformanceLog[], startDate: Date, endDate: Date, machineCreatedAt: string): MachineKPIs => {
    let uptimeMs = 0;
    let downtimeMs = 0;
    let nFailures = 0;
    let nRepairs = 0;
    let totalTimeToRepairMs = 0;

    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // We use machine creation date or start date as the base
    const machineCreatedDate = new Date(machineCreatedAt);
    const effectiveStart = startDate > machineCreatedDate ? startDate : machineCreatedDate;
    const effectiveEnd = endDate;
    const totalPeriodMs = effectiveEnd.getTime() - effectiveStart.getTime();

    if (totalPeriodMs <= 0) {
        return emptyKPIs();
    }

    let currentStatus: MachineStatus = 'SOLVED';
    let lastTime = effectiveStart.getTime();

    // 1. Determine status at effectiveStart
    for (const log of sortedLogs) {
        const logTime = new Date(log.timestamp).getTime();
        if (logTime < effectiveStart.getTime()) {
            currentStatus = log.toStatus;
        } else {
            break;
        }
    }

    // 2. Process logs within range
    for (const log of sortedLogs) {
        const logTime = new Date(log.timestamp).getTime();
        
        if (logTime < effectiveStart.getTime()) continue;
        if (logTime > effectiveEnd.getTime()) break;

        const duration = logTime - lastTime;
        if (currentStatus === 'SOLVED') {
            uptimeMs += duration;
            if (log.toStatus !== 'SOLVED') nFailures++;
        } else {
            downtimeMs += duration;
            if (log.toStatus === 'SOLVED') {
                nRepairs++;
                totalTimeToRepairMs += duration;
            }
        }

        currentStatus = log.toStatus;
        lastTime = logTime;
    }

    // 3. Final gap to end of period
    const finalDuration = effectiveEnd.getTime() - lastTime;
    if (currentStatus === 'SOLVED') {
        uptimeMs += finalDuration;
    } else {
        downtimeMs += finalDuration;
    }

    const availabilityPercent = (uptimeMs / totalPeriodMs) * 100;
    const mtbfMs = nFailures > 0 ? uptimeMs / nFailures : uptimeMs;
    const mttrMs = nRepairs > 0 ? totalTimeToRepairMs / nRepairs : (downtimeMs > 0 ? downtimeMs : 0);

    return {
        uptime: formatDuration(uptimeMs),
        downtime: formatDuration(downtimeMs),
        availability: availabilityPercent.toFixed(2) + '%',
        mtbf: formatDuration(mtbfMs),
        mttr: formatDuration(mttrMs),
        mttf: formatDuration(mtbfMs), // Using MTBF as MTTF approximation per logic discussed
        failures: nFailures,
        repairs: nRepairs,
        oee: (availabilityPercent * 0.9 * 0.99).toFixed(2) + '%', // Placement OEE
        history: sortedLogs.slice(-10).reverse()
    };
};

const emptyKPIs = (): MachineKPIs => ({
    uptime: '0s', downtime: '0s', availability: '100%', 
    mtbf: '0s', mttr: '0s', mttf: '0s', failures: 0, repairs: 0, 
    oee: '0%', history: []
});

export const formatDuration = (ms: number): string => {
    if (ms < 0) ms = 0;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};
