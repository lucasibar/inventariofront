import type { PerformanceLog, MachineKPI as MachineKPIs, Machine } from '../../../entities/performance/api/performanceApi';



type MachineStatus = Machine['status'];

export const calculateKPIs = (logs: PerformanceLog[], startDate: Date, endDate: Date, machineCreatedAt: string): MachineKPIs => {

    let uptimeMs = 0;
    let downtimeMs = 0;
    let nFailures = 0;
    let nRepairs = 0;
    let totalTimeToRepairMs = 0;

    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // We use machine creation date or start date as the base
    const parsedCreatedDate = new Date(machineCreatedAt);
    const machineCreatedDate = isNaN(parsedCreatedDate.getTime()) ? startDate : parsedCreatedDate;
    const effectiveStart = startDate > machineCreatedDate ? startDate : machineCreatedDate;
    const effectiveEnd = endDate;

    const totalPeriodMs = effectiveEnd.getTime() - effectiveStart.getTime();

    if (totalPeriodMs <= 0) {
        return emptyKPIs();
    }

    let currentStatus: MachineStatus = 'ACTIVA';
    let lastTime = effectiveStart.getTime();

    // 1. Determine status at effectiveStart
    for (const log of sortedLogs) {
        const logTime = new Date(log.timestamp).getTime();
        if (logTime < effectiveStart.getTime()) {
            currentStatus = log.toStatus as MachineStatus;
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
        if (currentStatus === 'ACTIVA') {
            uptimeMs += duration;
            if (log.toStatus !== 'ACTIVA') nFailures++;
        } else {
            downtimeMs += duration;
            if (log.toStatus === 'ACTIVA') {
                nRepairs++;
                totalTimeToRepairMs += duration;
            }
        }

        currentStatus = log.toStatus as MachineStatus;
        lastTime = logTime;
    }

    // 3. Final gap to end of period
    const finalDuration = effectiveEnd.getTime() - lastTime;
    if (currentStatus === 'ACTIVA') {
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

export const calculatePlantKPIs = (logs: PerformanceLog[], totalMachines: number, startDate: Date, endDate: Date): MachineKPIs => {
    if (totalMachines <= 0) return emptyKPIs();
    
    const logsByMachine: Record<string, PerformanceLog[]> = {};
    logs.forEach(log => {
        if (!logsByMachine[log.machineId]) logsByMachine[log.machineId] = [];
        logsByMachine[log.machineId].push(log);
    });

    const totalPeriodMs = endDate.getTime() - startDate.getTime();
    if (totalPeriodMs <= 0) return emptyKPIs();

    let totalUptimeMs = 0;
    let totalDowntimeMs = 0;
    let totalFailures = 0;
    let totalRepairs = 0;
    let totalReparationTimeMs = 0;

    // For each machine index (up to totalMachines)
    // We assume machines without logs were ACTIVA (100% uptime)
    // For machines WITH logs, we calculate their specific uptime/downtime
    
    // 1. Calculate for machines with logs
    Object.values(logsByMachine).forEach(mLogs => {
        calculateKPIs(mLogs, startDate, endDate, startDate.toISOString());
        // We need the raw MS, so we might need a version of calculateKPIs that returns them
        // or just re-calculate here for simplicity
        
        // --- Re-calculation block for plant-wide aggregation ---
        let mUptime = 0;
        let mDowntime = 0;
        let mFailures = 0;
        let mRepairs = 0;
        let mRepairTime = 0;
        
        const sorted = [...mLogs].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        let currentStatus = 'ACTIVA';
        let lastTime = startDate.getTime();
        
        for (const log of sorted) {
            const time = new Date(log.timestamp).getTime();
            if (time < startDate.getTime()) { currentStatus = log.toStatus; continue; }
            if (time > endDate.getTime()) break;
            
            const duration = time - lastTime;
            if (currentStatus === 'ACTIVA') mUptime += duration;
            else {
                mDowntime += duration;
                if (log.toStatus === 'ACTIVA') { mRepairs++; mRepairTime += duration; }
            }
            if (currentStatus === 'ACTIVA' && log.toStatus !== 'ACTIVA') mFailures++;
            currentStatus = log.toStatus;
            lastTime = time;
        }
        const finalGap = endDate.getTime() - lastTime;
        if (currentStatus === 'ACTIVA') mUptime += finalGap;
        else mDowntime += finalGap;
        // --- End re-calculation ---

        totalUptimeMs += mUptime;
        totalDowntimeMs += mDowntime;
        totalFailures += mFailures;
        totalRepairs += mRepairs;
        totalReparationTimeMs += mRepairTime;
    });

    // 2. Add 100% uptime for machines without logs
    const machinesWithLogs = Object.keys(logsByMachine).length;
    const machinesWithoutLogs = Math.max(0, totalMachines - machinesWithLogs);
    totalUptimeMs += machinesWithoutLogs * totalPeriodMs;

    const totalPossibleMs = totalMachines * totalPeriodMs;
    const globalAvailability = (totalUptimeMs / totalPossibleMs) * 100;
    
    return {
        uptime: formatDuration(totalUptimeMs),
        downtime: formatDuration(totalDowntimeMs),
        availability: globalAvailability.toFixed(2) + '%',
        mtbf: formatDuration(totalFailures > 0 ? totalUptimeMs / totalFailures : totalUptimeMs),
        mttr: formatDuration(totalRepairs > 0 ? totalReparationTimeMs / totalRepairs : (totalDowntimeMs > 0 ? totalDowntimeMs : 0)),
        mttf: formatDuration(totalFailures > 0 ? totalUptimeMs / totalFailures : totalUptimeMs),
        failures: totalFailures,
        repairs: totalRepairs,
        oee: (globalAvailability * 0.9 * 0.99).toFixed(2) + '%',
        history: logs.slice(-10).reverse()
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

