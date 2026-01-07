import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import DashboardWeb from './dashboard/DashboardWeb';
import DashboardMobile from './dashboard/DashboardMobile';

/**
 * Dashboard Component
 * Serves as a "Dual-Native" switcher.
 * Routes the user to either the Web (Desktop) optimized page or the Mobile (Nova Go) optimized page.
 */
const Dashboard: React.FC = () => {
    const isMobile = useIsMobile();

    return (
        <div className="w-full">
            {isMobile ? <DashboardMobile /> : <DashboardWeb />}
        </div>
    );
};

export default Dashboard;
