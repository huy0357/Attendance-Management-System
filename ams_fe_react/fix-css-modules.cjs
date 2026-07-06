const fs = require('fs');
const path = require('path');

function processFile(tsxPath, scssPath) {
    if (!fs.existsSync(tsxPath) || !fs.existsSync(scssPath)) {
        console.log(`Skipping. Paths do not exist: ${tsxPath}, ${scssPath}`);
        return;
    }

    const scssContent = fs.readFileSync(scssPath, 'utf8');
    const classRegex = /\.([a-zA-Z0-9_-]+)(?=\s|\{|\:|\>|\,)/g;
    const scssClasses = new Set();
    let match;
    while ((match = classRegex.exec(scssContent)) !== null) {
        scssClasses.add(match[1]);
    }
    
    console.log(`Found ${scssClasses.size} classes in ${path.basename(scssPath)}`);

    let tsxContent = fs.readFileSync(tsxPath, 'utf8');

    // Fix import
    const scssBasename = path.basename(scssPath);
    const importRegex1 = new RegExp(`import\\s+['"]./${scssBasename}['"];?`);
    const importRegex2 = new RegExp(`import\\s+styles\\s+from\\s+['"]./${scssBasename}['"];?`);
    
    if (importRegex1.test(tsxContent)) {
        tsxContent = tsxContent.replace(importRegex1, `import styles from './${scssBasename}';`);
    } else if (!importRegex2.test(tsxContent)) {
        // Find last import
        const lastImportIndex = tsxContent.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
            const endOfLine = tsxContent.indexOf('\n', lastImportIndex);
            tsxContent = tsxContent.slice(0, endOfLine + 1) + `import styles from './${scssBasename}';\n` + tsxContent.slice(endOfLine + 1);
        }
    }

    // Replace className="..."
    const classNameRegex = /className=["']([^"']+)["']/g;
    tsxContent = tsxContent.replace(classNameRegex, (match, classList) => {
        const classes = classList.split(/\s+/).filter(Boolean);
        let hasModuleClass = false;
        const newClasses = classes.map(cls => {
            if (scssClasses.has(cls)) {
                hasModuleClass = true;
                return `\${styles['${cls}']}`;
            }
            return cls;
        });

        if (hasModuleClass) {
            return `className={\`${newClasses.join(' ')}\`}`;
        }
        return match;
    });

    // Replace className={`...`} that might already have template literals or existing bindings? 
    // Just a basic pass for plain strings inside template literal classNames:
    const classNameLiteralRegex = /className=\{`([^`]+)`\}/g;
    tsxContent = tsxContent.replace(classNameLiteralRegex, (match, inner) => {
        // If it already contains ${styles, skip it
        if (inner.includes('${styles')) return match;

        let modified = false;
        const parts = inner.split(/(\$\{[^}]+\})/g); // Split by expressions like ${...}
        for (let i = 0; i < parts.length; i++) {
            if (!parts[i].startsWith('${')) {
                const textClasses = parts[i].split(/\s+/);
                const mappedTextClasses = textClasses.map(cls => {
                    if (scssClasses.has(cls)) {
                        modified = true;
                        return `\${styles['${cls}']}`;
                    }
                    return cls;
                });
                parts[i] = mappedTextClasses.join(' ');
            }
        }
        
        if (modified) {
            // Clean up accidental double spaces
            return `className={\`${parts.join('').replace(/\s+/g, ' ')}\`}`;
        }
        return match;
    });

    fs.writeFileSync(tsxPath, tsxContent, 'utf8');
    console.log(`Updated ${path.basename(tsxPath)}`);
}

// Map the specific files requested by the user: Dashboard, Employees, Departments.
// Plus Contracts, etc.
const components = [
    { tsx: 'src/features/dashboard/DashboardPage.tsx', scss: 'src/features/dashboard/DashboardPage.module.scss' },
    { tsx: 'src/features/hrm/employees/EmployeesPage.tsx', scss: 'src/features/hrm/employees/EmployeesPage.module.scss' },
    { tsx: 'src/features/hrm/departments/DepartmentsPage.tsx', scss: 'src/features/hrm/departments/DepartmentsPage.module.scss' },
    { tsx: 'src/features/hrm/contracts/ContractsPage.tsx', scss: 'src/features/hrm/contracts/ContractsPage.module.scss' },
    { tsx: 'src/features/attendance/attendance-daily/AttendanceDailyPage.tsx', scss: 'src/features/attendance/attendance-daily/AttendanceDailyPage.module.scss' },
    { tsx: 'src/features/admin/settings/SettingsPage.tsx', scss: 'src/features/admin/settings/SettingsPage.module.scss' },
    { tsx: 'src/features/admin/account-management/AccountManagementPage.tsx', scss: 'src/features/admin/account-management/AccountManagementPage.module.scss' },
    { tsx: 'src/features/attendance/leave-management/LeaveManagementPage.tsx', scss: 'src/features/attendance/leave-management/LeaveManagementPage.module.scss' },
    { tsx: 'src/features/attendance/ot-requests/OtRequestsPage.tsx', scss: 'src/features/attendance/ot-requests/OtRequestsPage.module.scss' },
    { tsx: 'src/features/attendance/requests-management/RequestsManagementPage.tsx', scss: 'src/features/attendance/requests-management/RequestsManagementPage.module.scss' },
    { tsx: 'src/features/attendance/scheduling/SchedulingPage.tsx', scss: 'src/features/attendance/scheduling/SchedulingPage.module.scss' },
    { tsx: 'src/features/attendance/shift-templates/ShiftTemplatesPage.tsx', scss: 'src/features/attendance/shift-templates/ShiftTemplatesPage.module.scss' },
    { tsx: 'src/features/hrm/employee-portal/EmployeePortalPage.tsx', scss: 'src/features/hrm/employee-portal/EmployeePortalPage.module.scss' },
];

components.forEach(comp => {
    processFile(path.resolve(__dirname, comp.tsx), path.resolve(__dirname, comp.scss));
});
