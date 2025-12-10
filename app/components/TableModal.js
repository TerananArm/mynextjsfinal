// app/components/TableModal.js
'use client';
import { createPortal } from 'react-dom';
import {
    X, Plus, FileDown, FileSpreadsheet, Trash2, Search,
    Pencil, ChevronLeft, ChevronRight, GraduationCap, Filter, Sparkles
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ConfirmModal from './ConfirmModal';
import DatePicker from './DatePicker';

export default function TableModal({ isOpen, onClose, title, type, data }) {
    const { isDarkMode } = useTheme();
    const { t } = useLanguage();
    const { play } = useSound();
    const { data: session } = useSession();
    const role = session?.user?.role || 'student';
    const [filters, setFilters] = useState({});
    const [localData, setLocalData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState([]);
    const [mounted, setMounted] = useState(false);
    const [view, setView] = useState('list'); // 'list', 'add', 'edit'
    const [formData, setFormData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);
    const itemsPerPage = 10;

    // ... (existing useEffects)

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            setLocalData(data || []);
            setSearchTerm('');
            setFilters({}); // Reset filters
            setCurrentPage(1);
            setSelectedIds([]);
            setView('list'); // Reset view
            setFormData({});
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            setMounted(false);
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, data, onClose]);

    const router = useRouter();
    const supportedTypes = ['students', 'teachers', 'subjects', 'rooms', 'departments', 'users', 'curriculum', 'schedule'];

    const handleAdd = () => {
        play('click');
        if (supportedTypes.includes(type)) {
            router.push(`/dashboard/${type}`);
        } else {
            setView('add');
            setFormData({});
        }
    };

    const handleEdit = (item) => {
        play('click');
        if (supportedTypes.includes(type)) {
            const id = item.id || item.code || item.username;
            router.push(`/dashboard/${type}?id=${id}`);
        } else {
            setView('edit');
            setFormData({ ...item });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const url = view === 'add' ? '/api/dashboard/add' : '/api/dashboard/update';
            const method = view === 'add' ? 'POST' : 'PUT';
            const body = { type, data: formData };
            if (view === 'edit') body.id = formData.id || formData.code || formData.username; // Adjust ID based on type

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await res.json();

            if (!res.ok) throw new Error(result.message || await res.text());

            // Show Success Popup
            await Swal.fire({
                icon: 'success',
                title: t('success'),
                text: result.message || t('saveSuccess'),
                background: isDarkMode ? '#1e293b' : '#fff',
                color: isDarkMode ? '#fff' : '#000',
                confirmButtonColor: '#3b82f6'
            });

            window.location.reload();
        } catch (error) {
            console.error(error);
            // Show Error Popup
            await Swal.fire({
                icon: 'error',
                title: t('error'),
                text: error.message,
                background: isDarkMode ? '#1e293b' : '#fff',
                color: isDarkMode ? '#fff' : '#000',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (item) => {
        play('click');
        const result = await Swal.fire({
            title: t('confirmDelete'),
            text: t('confirmDeleteMessage') || 'คุณต้องการลบรายการนี้ใช่หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: t('deleteBtn') || 'ลบ',
            cancelButtonText: t('cancel') || 'ยกเลิก',
            background: isDarkMode ? '#1e293b' : '#fff',
            color: isDarkMode ? '#fff' : '#000'
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch('/api/dashboard/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, id: item.id || item.code || item.username })
            });
            if (res.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: t('success'),
                    text: t('deleteSuccess'),
                    timer: 1500,
                    showConfirmButton: false,
                    background: isDarkMode ? '#1e293b' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                });
                setLocalData(prev => prev.filter(i => i !== item));
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: t('error'),
                    text: t('deleteFailed'),
                    background: isDarkMode ? '#1e293b' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                });
            }
        } catch (error) {
            console.error(error);
            await Swal.fire({
                icon: 'error',
                title: t('error'),
                text: error.message,
                background: isDarkMode ? '#1e293b' : '#fff',
                color: isDarkMode ? '#fff' : '#000'
            });
        }
    };

    const handleBulkDelete = async () => {
        play('click');
        const result = await Swal.fire({
            title: t('confirmDelete'),
            text: `${t('confirmDelete')} ${selectedIds.length} ${t('items')}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: t('deleteBtn') || 'ลบ',
            cancelButtonText: t('cancel') || 'ยกเลิก',
            background: isDarkMode ? '#1e293b' : '#fff',
            color: isDarkMode ? '#fff' : '#000'
        });

        if (!result.isConfirmed) return;

        try {
            // Loop for now as API might not support bulk
            for (const id of selectedIds) {
                await fetch('/api/dashboard/delete', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type, id })
                });
            }
            await Swal.fire({
                icon: 'success',
                title: t('success'),
                text: t('deleteSuccess'),
                timer: 1500,
                showConfirmButton: false,
                background: isDarkMode ? '#1e293b' : '#fff',
                color: isDarkMode ? '#fff' : '#000'
            });
            window.location.reload();
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: t('error'),
                text: t('deleteFailed'),
                background: isDarkMode ? '#1e293b' : '#fff',
                color: isDarkMode ? '#fff' : '#000'
            });
        }
    };

    const handleDownloadTemplate = () => {
        play('pop');
        const templateConfig = {
            students: {
                headers: ['id', 'name', 'department', 'level', 'birthdate', 'password'],
                samples: [
                    ['660001', 'สมชาย ใจดี', 'เทคโนโลยีสารสนเทศ', 'ปวช.1', '2005-01-15', '1234'],
                    ['660002', 'สมหญิง รักเรียน', 'เทคโนโลยีสารสนเทศ', 'ปวช.1', '2005-03-22', '1234'],
                    ['660003', 'วิชัย เก่งกาจ', 'การบัญชี', 'ปวช.2', '2004-07-10', '1234'],
                    ['660004', 'นิดา สวยงาม', 'การตลาด', 'ปวส.1', '2003-11-05', '1234'],
                    ['660005', 'ประยุทธ์ มั่นคง', 'ช่างยนต์', 'ปวช.3', '2003-09-18', '1234']
                ]
            },
            teachers: {
                headers: ['id', 'name', 'department', 'room', 'max_hours', 'birthdate', 'password'],
                samples: [
                    ['T001', 'อ.สมศรี รักสอน', 'สามัญสัมพันธ์', '401', '20', '1980-05-15', 'teach001'],
                    ['T002', 'อ.วิชัย คณิตเด่น', 'สามัญสัมพันธ์', '402', '18', '1975-08-22', 'teach002'],
                    ['T003', 'อ.นภา โปรแกรมเมอร์', 'เทคโนโลยีสารสนเทศ', '301', '22', '1985-03-10', 'teach003'],
                    ['T004', 'อ.ประเสริฐ บัญชีดี', 'การบัญชี', '201', '16', '1978-12-01', 'teach004'],
                    ['T005', 'อ.สุดา ขายเก่ง', 'การตลาด', '501', '20', '1982-06-25', 'teach005']
                ]
            },
            subjects: {
                headers: ['code', 'name', 'department', 'credit', 'theory', 'practice'],
                samples: [
                    ['3000-0101', 'ภาษาไทยเพื่ออาชีพ 1', 'สามัญสัมพันธ์', '2', '2', '0'],
                    ['3000-0201', 'ภาษาอังกฤษในชีวิตจริง', 'สามัญสัมพันธ์', '2', '2', '0'],
                    ['3000-0301', 'วิทยาศาสตร์เพื่อพัฒนาอาชีพ', 'สามัญสัมพันธ์', '3', '2', '2'],
                    ['2204-2001', 'การเขียนโปรแกรมภาษาซี', 'เทคโนโลยีสารสนเทศ', '3', '1', '4'],
                    ['2201-2001', 'หลักการบัญชี 1', 'การบัญชี', '3', '2', '2']
                ]
            },
            rooms: {
                headers: ['name', 'type', 'capacity'],
                samples: [
                    ['ห้อง 101', 'lecture', '40'],
                    ['ห้อง 102', 'lecture', '35'],
                    ['Lab คอม 1', 'lab', '30'],
                    ['Lab คอม 2', 'lab', '30'],
                    ['ห้องประชุม A', 'lecture', '100']
                ]
            },
            departments: {
                headers: ['name'],
                samples: [
                    ['เทคโนโลยีสารสนเทศ'],
                    ['การบัญชี'],
                    ['การตลาด'],
                    ['ช่างยนต์'],
                    ['สามัญสัมพันธ์']
                ]
            },
            users: {
                headers: ['username', 'name', 'password'],
                samples: [
                    ['teacher01', 'ครูสมชาย', 'pass1234'],
                    ['teacher02', 'ครูสมหญิง', 'pass1234'],
                    ['staff01', 'เจ้าหน้าที่ 1', 'staff001'],
                    ['admin2', 'ผู้ดูแลระบบ 2', 'admin123'],
                    ['hod_it', 'หัวหน้าแผนก IT', 'hodit2024']
                ]
            },
            class_levels: {
                headers: ['level', 'department_name'],
                samples: [
                    ['ปวช.1', 'เทคโนโลยีสารสนเทศ'],
                    ['ปวช.2', 'เทคโนโลยีสารสนเทศ'],
                    ['ปวช.3', 'เทคโนโลยีสารสนเทศ'],
                    ['ปวส.1', 'การบัญชี'],
                    ['ปวส.2', 'การตลาด']
                ]
            }
        };

        const config = templateConfig[type];
        if (!config) {
            alert(t('noData'));
            return;
        }

        // Create sheet with headers + multiple sample rows
        const sheetData = [config.headers, ...config.samples];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        // Auto-fit column widths
        const colWidths = config.headers.map((header, i) => {
            const maxLen = Math.max(
                header.length,
                ...config.samples.map(row => String(row[i] || '').length)
            );
            return { wch: Math.min(maxLen + 2, 40) }; // Max width 40
        });
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        // Use blob-based download for consistent filename
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_template.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file extension
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
            Swal.fire({
                icon: 'error',
                title: t('error'),
                text: 'Please upload only .xlsx or .xls files',
                background: isDarkMode ? '#1e293b' : '#fff',
                color: isDarkMode ? '#fff' : '#000'
            });
            return;
        }

        // Reset file input
        e.target.value = '';

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = evt.target.result;
                const wb = XLSX.read(data, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = XLSX.utils.sheet_to_json(ws, { cellDates: true });

                if (jsonData.length === 0) {
                    Swal.fire({ icon: 'warning', title: t('warning'), text: t('excelEmpty') });
                    return;
                }

                const result = await Swal.fire({
                    title: t('confirm'),
                    text: t('foundItems').replace('{count}', jsonData.length),
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: t('importBtn'),
                    cancelButtonText: t('cancel'),
                    background: isDarkMode ? '#1e293b' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                });

                if (!result.isConfirmed) return;

                let successCount = 0;
                let failCount = 0;
                let duplicateCount = 0;

                Swal.fire({
                    title: t('processing'),
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading(),
                    background: isDarkMode ? '#1e293b' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                });

                for (const item of jsonData) {
                    try {
                        // Map 'dept' to 'department' for API if present
                        const payload = { ...item };
                        if (payload.dept) payload.department = payload.dept;

                        // Format Date objects to YYYY-MM-DD
                        if (payload.birthdate instanceof Date) {
                            const year = payload.birthdate.getFullYear();
                            const month = String(payload.birthdate.getMonth() + 1).padStart(2, '0');
                            const day = String(payload.birthdate.getDate()).padStart(2, '0');
                            payload.birthdate = `${year}-${month}-${day}`;
                        }

                        const res = await fetch('/api/dashboard/add', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type, data: payload })
                        });
                        if (res.ok) {
                            successCount++;
                        } else if (res.status === 409) {
                            duplicateCount++;
                        } else {
                            failCount++;
                        }
                    } catch (err) {
                        console.error(err);
                        failCount++;
                    }
                }

                await Swal.fire({
                    icon: successCount > 0 ? 'success' : 'warning',
                    title: t('success'),
                    text: `${t('success')}: ${successCount}, ${t('duplicateMsg').split(':')[0]}: ${duplicateCount}, ${t('error')}: ${failCount}`,
                    background: isDarkMode ? '#1e293b' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                });

                window.location.reload();
            } catch (error) {
                console.error(error);
                Swal.fire({
                    icon: 'error',
                    title: t('error'),
                    text: t('invalidExcel'),
                    background: isDarkMode ? '#1e293b' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleCleanData = async () => {
        play('click');
        if (!localData || localData.length === 0) {
            Swal.fire({ icon: 'warning', title: t('warning'), text: t('noDataToClean') || 'No data to clean' });
            return;
        }

        const result = await Swal.fire({
            title: t('cleanDataConfirm') || 'AI Data Cleanup',
            text: t('cleanDataDesc') || 'AI will format names (remove prefixes) and fix spacing. This may take a few seconds.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: t('startCleanup') || 'Start Cleanup',
            cancelButtonText: t('cancel'),
            background: isDarkMode ? '#1e293b' : '#fff',
            color: isDarkMode ? '#fff' : '#000'
        });

        if (!result.isConfirmed) return;

        setIsLoading(true);
        Swal.fire({
            title: t('processing'),
            text: t('aiProcessing') || 'AI is cleaning your data...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            background: isDarkMode ? '#1e293b' : '#fff',
            color: isDarkMode ? '#fff' : '#000'
        });

        try {
            const res = await fetch('/api/ai-cleanup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: localData, type })
            });

            if (!res.ok) throw new Error(await res.text());

            const cleanedData = await res.json();

            // Show preview/confirmation before applying
            // For now, we'll just update localData and let user save individually or we can implement bulk update
            // Given the user request "Help me format...", updating localData allows them to see changes.
            // But to persist, we might need to auto-save or let them save.
            // Since there's no bulk save, we will try to bulk update the backend for the changed items.

            // Let's just update localData first and notify user.
            setLocalData(cleanedData);

            // OPTIONAL: Auto-save cleaned data to backend?
            // User said "Clean Data" button. Usually implies action.
            // Let's ask user if they want to save changes to database.

            const saveResult = await Swal.fire({
                title: t('cleanupComplete') || 'Cleanup Complete!',
                text: t('saveChangesQuery') || `AI cleaned ${cleanedData.length} items. Do you want to save these changes to the database?`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: t('saveChanges') || 'Save Changes',
                cancelButtonText: t('reviewOnly') || 'Review Only',
                background: isDarkMode ? '#1e293b' : '#fff',
                color: isDarkMode ? '#fff' : '#000'
            });

            if (saveResult.isConfirmed) {
                // Bulk Update
                Swal.fire({
                    title: t('saving'),
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading(),
                    background: isDarkMode ? '#1e293b' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                });

                let successCount = 0;
                for (const item of cleanedData) {
                    try {
                        await fetch('/api/dashboard/update', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type, data: item, id: item.id || item.code || item.username })
                        });
                        successCount++;
                    } catch (e) {
                        console.error(e);
                    }
                }

                Swal.fire({
                    icon: 'success',
                    title: t('saved'),
                    text: `${t('saved')} ${successCount} items.`,
                    background: isDarkMode ? '#1e293b' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                });
                window.location.reload();
            }

        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: t('error'),
                text: error.message,
                background: isDarkMode ? '#1e293b' : '#fff',
                color: isDarkMode ? '#fff' : '#000'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Logic
    const filterableColumns = ['dept', 'level', 'type', 'room', 'department_name', 'department'];
    const availableFilters = filterableColumns.filter(col => data && data.some(item => item[col]));

    const getUniqueValues = (col) => [...new Set(data.map(item => item[col]).filter(Boolean))];

    const filteredData = localData.filter(item => {
        const matchesSearch = Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilters = Object.entries(filters).every(([key, value]) => !value || item[key] === value);
        return matchesSearch && matchesFilters;
    });

    // ... (existing pagination logic using filteredData)
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getItemId = (item, index) => item.id || item.code || item.username || index;

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredData.map((item, i) => getItemId(item, i)));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const isAllSelected = filteredData.length > 0 && selectedIds.length === filteredData.length;

    // Day Mapping
    const dayMap = { 1: 'จันทร์', 2: 'อังคาร', 3: 'พุธ', 4: 'พฤหัสบดี', 5: 'ศุกร์', 6: 'เสาร์', 7: 'อาทิตย์' };

    // Dynamic Columns with Translations
    const columns = {
        students: [{ k: 'id', l: t('studentId') }, { k: 'name', l: t('students') }, { k: 'dept', l: t('department') }, { k: 'level', l: t('classLevel') }, { k: 'birthdate', l: t('birthdate'), fmt: (v) => v ? new Date(v).toLocaleDateString('th-TH') : '-' }],
        teachers: [{ k: 'id', l: t('teacherId') }, { k: 'name', l: t('teacher') }, { k: 'dept', l: t('department') }, { k: 'room', l: t('room') }, { k: 'max_hours', l: t('maxHours') }, { k: 'birthdate', l: t('birthdate'), fmt: (v) => v ? new Date(v).toLocaleDateString('th-TH') : '-' }],
        subjects: [{ k: 'code', l: t('subjectCode') }, { k: 'name', l: t('subject') }, { k: 'credit', l: t('credit') }, { k: 'dept', l: t('department') }, { k: 'theory_hours', l: t('theory') }, { k: 'practice_hours', l: t('practice') }],
        rooms: [{ k: 'name', l: t('room') }, { k: 'type', l: t('type') }, { k: 'capacity', l: t('capacity') }],
        departments: [{ k: 'name', l: t('department') }],
        users: [{ k: 'username', l: t('username') }, { k: 'fullname', l: t('fullname') }, { k: 'role', l: t('role') }],
        class_levels: [{ k: 'level', l: t('classLevel') }, { k: 'department_name', l: t('department') }, { k: 'count', l: t('studentCount') }],
        curriculum: [{ k: 'level', l: t('classLevel') }, { k: 'code', l: t('subjectCode') }, { k: 'subject_name', l: t('subject') }],
        schedule: [
            { k: 'day_of_week', l: t('day'), fmt: (v) => dayMap[v] || v },
            { k: 'start_period', l: t('period'), fmt: (v, item) => `${v} - ${item.end_period}` },
            { k: 'level', l: t('classLevel') },
            { k: 'dept', l: t('department') },
            { k: 'subject', l: t('subject') },
            { k: 'teacher', l: t('teacher') }
        ],
        scheduled_subjects: [{ k: 'code', l: t('subjectCode') }, { k: 'name', l: t('subject') }, { k: 'dept', l: t('department') }],
        credits: [{ k: 'code', l: t('subjectCode') }, { k: 'name', l: t('subject') }, { k: 'credit', l: t('credit') }],
        hours: [{ k: 'name', l: t('teacher') }, { k: 'total_hours', l: t('totalHours') }],
        logs: [{ k: 'user', l: t('users') }, { k: 'action', l: t('action') }, { k: 'timestamp', l: t('time') }],
    }[type] || [{ k: 'name', l: t('item') }];

    const modalBg = isDarkMode ? 'bg-slate-900/85 backdrop-blur-2xl border border-white/10' : 'bg-white/85 backdrop-blur-2xl border border-white/20';
    const textColor = isDarkMode ? 'text-white' : 'text-slate-900';
    const subTextColor = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    const dividerColor = isDarkMode ? 'border-white/10' : 'border-slate-900/5';
    const tableHeaderBg = isDarkMode ? 'bg-slate-900/95 backdrop-blur-md text-slate-200 shadow-sm' : 'bg-white/95 backdrop-blur-md text-slate-700 shadow-sm';

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-md transition-opacity" onClick={onClose} />

            {/* Modal Container */}
            <div className={`relative w-full max-w-6xl flex flex-col rounded-[32px] overflow-hidden animate-zoom-in ${modalBg} shadow-2xl`} style={{ maxHeight: '85vh' }}>

                {/* Header */}
                <div className={`px-8 pt-8 pb-6 flex justify-between items-start shrink-0 z-20`}>
                    {/* ... (Header content) */}
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className={`p-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                {type === 'students' ? <GraduationCap size={28} /> : <Filter size={28} />}
                            </div>
                            <h2 className={`text-3xl font-black tracking-tight ${textColor}`}>{title}</h2>
                        </div>
                        <p className={`text-sm font-medium ${subTextColor} pl-1`}>{t('manageData').replace('{title}', title)}</p>
                    </div>
                    <button onClick={onClose} className={`p-3 rounded-full transition-all hover:rotate-90 active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-600'}`}>
                        <X size={24} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className={`px-8 pb-6 flex flex-wrap items-center gap-3 shrink-0 border-b ${dividerColor} mx-8 mb-6`}>

                    {/* Action Buttons - Admin Only */}
                    {role === 'admin' && (
                        <>
                            <button onClick={handleAdd} className={`flex items-center justify-center gap-2 px-5 py-3 min-w-[140px] text-sm font-bold rounded-2xl border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'}`}><Plus size={18} /> {t('addSubjectBtn')}</button>
                            <button onClick={handleDownloadTemplate} className={`flex items-center justify-center gap-2 px-5 py-3 min-w-[140px] text-sm font-bold rounded-2xl border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'}`}><FileDown size={18} /> {t('templateBtn')}</button>
                            <button onClick={() => fileInputRef.current.click()} className={`flex items-center justify-center gap-2 px-5 py-3 min-w-[140px] text-sm font-bold rounded-2xl border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-emerald-400' : 'bg-white border-slate-200 hover:bg-slate-50 text-emerald-700 shadow-sm'}`}><FileSpreadsheet size={18} /> {t('importBtn')}</button>

                            {/* ✨ AI Clean Data Button */}
                            <button
                                onClick={handleCleanData}
                                disabled={isLoading}
                                className={`flex items-center justify-center gap-2 px-5 py-3 min-w-[140px] text-sm font-bold rounded-2xl border transition-all active:scale-95 group ${isDarkMode ? 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 text-purple-400' : 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-600 shadow-sm'}`}
                            >
                                <Sparkles size={18} className="group-hover:animate-spin-slow" />
                                {t('cleanData') || 'Clean Data'}
                            </button>

                            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                                className={`flex items-center justify-center gap-2 px-5 py-3 min-w-[140px] text-sm font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${selectedIds.length > 0
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/30 animate-fade-in'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:text-slate-500 shadow-none'
                                    }`}
                            >
                                <Trash2 size={18} /> {t('delete')} {selectedIds.length > 0 ? selectedIds.length : ''}
                            </button>
                        </>
                    )}

                    {/* Filters */}
                    {availableFilters.map(col => (
                        <div key={col} className="relative">
                            <select
                                value={filters[col] || ''}
                                onChange={(e) => { play('select'); setFilters({ ...filters, [col]: e.target.value }); }}
                                className={`appearance-none pl-4 pr-10 py-3 min-w-[140px] rounded-2xl text-sm font-bold border outline-none cursor-pointer transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                <option value="">{t('filterAll').replace('{label}', columns.find(c => c.k === col)?.l || col)}</option>
                                {getUniqueValues(col).map(val => <option key={val} value={val}>{val}</option>)}
                            </select>
                            <Filter size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                        </div>
                    ))}

                    {/* Search - Flexible Width */}
                    <div className="relative flex-1 min-w-[200px] group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={20} />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-2xl text-sm font-medium outline-none transition-all placeholder:font-normal ${isDarkMode
                                ? 'bg-black/20 focus:bg-black/40 text-white placeholder-slate-600'
                                : 'bg-slate-100/50 focus:bg-white border-transparent focus:shadow-md text-slate-700 placeholder-slate-400'
                                }`}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className={`flex-1 overflow-auto custom-scrollbar relative px-8 pb-4`}>
                    {view === 'list' ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 text-xs font-bold uppercase tracking-wider">
                                <tr>
                                    <th className={`px-4 py-4 rounded-l-xl text-center w-14 ${tableHeaderBg}`}>
                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer" checked={isAllSelected} onChange={handleSelectAll} />
                                    </th>
                                    <th className={`px-4 py-4 text-center w-16 ${tableHeaderBg}`}>{t('seq')}</th>
                                    {columns.map((col, idx) => (<th key={idx} className={`px-4 py-4 ${tableHeaderBg}`}>{col.l}</th>))}
                                    <th className={`px-4 py-4 text-center rounded-r-xl w-24 ${tableHeaderBg}`}>{t('action')}</th>
                                </tr>
                            </thead>

                            <tbody className={`text-sm font-medium ${isDarkMode ? 'text-slate-200 divide-y divide-white/5' : 'text-slate-700 divide-y divide-slate-100/50'}`}>
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((item, i) => {
                                        const realIndex = (currentPage - 1) * itemsPerPage + i + 1;
                                        const itemId = getItemId(item, i);
                                        const isSelected = selectedIds.includes(itemId);
                                        // Calculate delay based on index (max 500ms)
                                        const delayClass = i < 10 ? `delay-${i * 75}` : 'delay-500';

                                        return (
                                            <tr key={itemId} className={`group border-b border-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200 rounded-xl animate-slide-up opacity-0 ${delayClass} ${isSelected ? (isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50/50') : ''}`}>
                                                <td className="px-4 py-4 text-center">
                                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer" checked={isSelected} onChange={() => handleSelectOne(itemId)} />
                                                </td>
                                                <td className={`px-4 py-4 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{realIndex}</td>
                                                {columns.map((col, idx) => (
                                                    <td key={idx} className="px-4 py-4">
                                                        {col.fmt ? col.fmt(item[col.k], item) : item[col.k]}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        {(role === 'admin' || role === 'teacher') && (
                                                            <button onClick={() => handleEdit(item)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-white text-slate-600 hover:shadow-sm'}`}><Pencil size={16} /></button>
                                                        )}
                                                        {role === 'admin' && (
                                                            <button onClick={() => handleDelete(item)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500 hover:shadow-sm'}`}><Trash2 size={16} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan="100%" className="p-20 text-center"><div className="flex flex-col items-center justify-center opacity-40 gap-3"><FileSpreadsheet size={64} className="text-slate-400" /><p className="text-lg font-bold">{t('noData')}</p></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <form onSubmit={handleSave} className="max-w-2xl mx-auto py-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {columns.map((col) => (
                                    <div key={col.k} className="flex flex-col gap-2">
                                        <label className={`text-sm font-bold ${subTextColor}`}>{col.l}</label>
                                        {(col.k.includes('date') || col.k === 'birthdate') ? (
                                            <DatePicker
                                                value={formData[col.k]}
                                                onChange={(date) => setFormData({ ...formData, [col.k]: date })}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={formData[col.k] || ''}
                                                onChange={(e) => setFormData({ ...formData, [col.k]: e.target.value })}
                                                className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all ${isDarkMode
                                                    ? 'bg-black/20 focus:bg-black/40 text-white border border-white/10 focus:border-white/30'
                                                    : 'bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:shadow-sm text-slate-900'
                                                    }`}
                                                required={!col.optional}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-dashed border-slate-200 dark:border-white/10">
                                <button type="button" onClick={() => setView('list')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isDarkMode ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>{t('cancel')}</button>
                                <button type="submit" disabled={isLoading} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isLoading ? 'Saving...' : t('save')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer (Only show in list view) */}
                {view === 'list' && (
                    <div className={`px-8 py-5 flex justify-between items-center shrink-0 border-t ${dividerColor} mt-4`}>
                        <span className={`text-xs font-semibold ${subTextColor}`}>{t('showing').replace('{start}', paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0).replace('{end}', Math.min(currentPage * itemsPerPage, filteredData.length)).replace('{total}', filteredData.length)}</span>
                        <div className="flex items-center gap-2">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-white/10 disabled:opacity-30' : 'hover:bg-black/5 disabled:opacity-30'}`}><ChevronLeft size={20} /></button>
                            <div className={`px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white border text-black'}`}>{currentPage}</div>
                            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-white/10 disabled:opacity-30' : 'hover:bg-black/5 disabled:opacity-30'}`}><ChevronRight size={20} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}