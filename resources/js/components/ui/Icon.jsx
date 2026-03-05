import React from 'react';
import { Icon } from '@iconify/react';

/**
 * Icon wrapper component using Iconify
 * 
 * Usage:
 * <Icon icon="material-symbols:menu" className="w-6 h-6" />
 * <Icon icon="material-symbols:home" width={24} />
 * 
 * @param {string} icon - Icon name in format "prefix:name"
 * @param {string|number} width - Icon width
 * @param {string|number} height - Icon height  
 * @param {string} className - Additional CSS classes
 * @param {string} color - Icon color
 * @param {function} onClick - Click handler
 */
export default function IconifyIcon({ 
    icon, 
    width = 24, 
    height,
    className = '', 
    color,
    onClick,
    ...props 
}) {
    return (
        <Icon
            icon={icon}
            width={width}
            height={height || width}
            className={className}
            color={color}
            onClick={onClick}
            {...props}
        />
    );
}

// Preset icons untuk E-SPMI
export const Icons = {
    // Navigation & Layout
    menu: 'material-symbols:menu',
    close: 'material-symbols:close',
    back: 'material-symbols:arrow-back',
    home: 'material-symbols:home',
    dashboard: 'material-symbols:dashboard',
    
    // Sidebar Menu
    standard: 'material-symbols:description',
    execution: 'material-symbols:folder-open',
    audit: 'material-symbols:search',
    ptk: 'material-symbols:build',
    report: 'material-symbols:insert-chart',
    settings: 'material-symbols:settings',
    
    // Node Types (Standard Builder)
    folder: 'material-symbols:folder',
    document: 'material-symbols:description',
    target: 'material-symbols:target',
    
    // Tree
    expand: 'material-symbols:expand-more',
    collapse: 'material-symbols:chevron-right',
    
    // Status
    locked: 'material-symbols:lock',
    unlocked: 'material-symbols:lock-open',
    shield: 'material-symbols:shield',
    pending: 'material-symbols:schedule',
    refresh: 'material-symbols:refresh',
    draft: 'material-symbols:edit-document',
    
    // UI
    sun: 'material-symbols:light-mode',
    moon: 'material-symbols:dark-mode',
    bell: 'material-symbols:notifications',
    search: 'material-symbols:search',
    info: 'material-symbols:info',
    warning: 'material-symbols:warning',
    error: 'material-symbols:error',
    success: 'material-symbols:check-circle',
    
    // Actions
    add: 'material-symbols:add',
    edit: 'material-symbols:edit',
    delete: 'material-symbols:delete',
    save: 'material-symbols:save',
    cancel: 'material-symbols:cancel',
    check: 'material-symbols:check',
    
    // Sorting
    sortAsc: 'material-symbols:arrow-upward',
    sortDesc: 'material-symbols:arrow-downward',
    sort: 'material-symbols:import-export',
    
    // Pagination
    first: 'material-symbols:first-page',
    last: 'material-symbols:last-page',
    prev: 'material-symbols:chevron-left',
    next: 'material-symbols:chevron-right',
    
    // Branding
    logo: 'material-symbols:eco',
};
