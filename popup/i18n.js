/**
 * Lightweight internationalization for NebulaTraceX popup.
 */

const TRANSLATIONS = {
	en: {
		tabs: {
			home: 'HOME',
			sitemap: 'SITE-MAP',
			stats: 'STATS',
			settings: 'SETTINGS'
		},
		recorder: {
			ready: 'Ready to record',
			recording: 'Recording...',
			start_btn: 'Start Recording',
			stop_btn: 'Stop Recording',
			screenshot_btn: 'Capture Screenshot',
			view_site: 'View Site Details',
			session_prompt: 'Choose a tab to start...',
			note_label: 'Notes',
			note_placeholder: 'Describe bug or context... (auto-saved)',
			empty_title: 'No steps yet',
			empty_desc: 'Click "Start Recording" and interact with the page'
		},
		sitemap: {
			search_placeholder: 'Search site...',
			empty: 'No sites yet',
			view: 'View',
			back: 'Back',
			sessions: 'Sessions',
			steps: 'Steps',
			close: 'Close',
			image_note: 'Add a note for this image...',
			open_window: 'Open Window',
			pen: 'Pen',
			clear: 'Clear',
			save: 'Save'
		},
		logs: {
			search_placeholder: 'Search action, selector...',
			filter_all: 'All',
			filter_click: 'Click',
			filter_input: 'Input',
			filter_network: 'Network',
			filter_error: 'Error',
			empty_no_results: 'No results found',
			empty_try_filter: 'Try changing the filters',
			empty_no_steps: 'No steps recorded yet',
			empty_desc: 'Record a session to see the timeline here'
		},
		details: {
			no_session: '(No session selected)',
			in_progress: 'In progress',
			tab_steps: 'Steps',
			tab_networks: 'Networks',
			tab_images: 'Images',
			count_steps: 'Steps',
			count_networks: 'Networks',
			count_images: 'Images',
			empty_steps: 'No steps recorded yet',
			empty_networks: 'No network calls recorded yet',
			empty_images: 'No screenshots yet'
		},
		stats: {
			skeleton_project: 'Allocated by Project',
			projects_label: 'Projects',
			col_project: 'Project',
			col_sessions: 'Sessions',
			col_steps: 'Steps',
			col_errors: 'Errors',
			empty_data: 'No data yet',
			btn_clear: 'Clear all data',
			clear_confirm: 'Clear all data? This cannot be undone.'
		},
		common: {
			copy: 'Copy',
			copied: 'Copied!',
			unknown_url: 'Unknown URL'
		},
		settings: {
			title: 'Settings',
			desc: 'This section will contain preferences and advanced options.'
		}
	},
	vi: {
		tabs: {
			home: 'HOME',
			sitemap: 'SITE-MAP',
			stats: 'THỐNG KÊ',
			settings: 'CÀI ĐẶT'
		},
		recorder: {
			ready: 'Sẵn sàng ghi',
			recording: 'Đang ghi...',
			start_btn: 'Bắt đầu ghi',
			stop_btn: 'Dừng ghi',
			screenshot_btn: 'Chụp ảnh màn hình',
			view_site: 'Xem chi tiết site',
			session_prompt: 'Chọn tab để bắt đầu...',
			note_label: 'Ghi chú',
			note_placeholder: 'Mô tả bug hoặc context... (lưu tự động)',
			empty_title: 'Chưa có bước nào',
			empty_desc: 'Nhấn "Bắt đầu ghi" rồi thao tác trên trang web'
		},
		sitemap: {
			search_placeholder: 'Tìm site...',
			empty: 'Chưa có site nào',
			view: 'Xem',
			back: 'Quay lại',
			sessions: 'Phiên',
			steps: 'Bước',
			close: 'Đóng',
			image_note: 'Ghi chú cho ảnh này...',
			open_window: 'Mở cửa sổ',
			pen: 'Bút',
			clear: 'Xoá',
			save: 'Lưu'
		},
		logs: {
			search_placeholder: 'Tìm action, selector...',
			filter_all: 'Tất cả',
			filter_click: 'Click',
			filter_input: 'Input',
			filter_network: 'Network',
			filter_error: 'Error',
			empty_no_results: 'Không có kết quả',
			empty_try_filter: 'Thử thay đổi bộ lọc',
			empty_no_steps: 'Chưa có bước nào được ghi',
			empty_desc: 'Ghi lại để thấy timeline ở đây'
		},
		details: {
			no_session: '(Chưa có session nào)',
			in_progress: 'Đang ghi',
			tab_steps: 'Steps',
			tab_networks: 'Networks',
			tab_images: 'Images',
			count_steps: 'Steps',
			count_networks: 'Networks',
			count_images: 'Images',
			empty_steps: 'Chưa có bước nào',
			empty_networks: 'Chưa có network call',
			empty_images: 'Chưa có ảnh chụp'
		},
		stats: {
			skeleton_project: 'Phân bổ theo Project',
			projects_label: 'Dự án',
			col_project: 'Dự án',
			col_sessions: 'Phiên',
			col_steps: 'Bước',
			col_errors: 'Lỗi',
			empty_data: 'Chưa có dữ liệu',
			btn_clear: 'Xóa tất cả dữ liệu',
			clear_confirm: 'Xóa toàn bộ dữ liệu? Không thể hoàn tác.'
		},
		common: {
			copy: 'Copy',
			copied: 'Đã copy!',
			unknown_url: 'Không rõ URL'
		},
		settings: {
			title: 'Cài đặt',
			desc: 'Khu vực này sẽ chứa tuỳ chọn và thiết lập nâng cao.'
		}
	}
};

let currentLang = localStorage.getItem('br-lang') || 'en';

export function setLanguage(lang) {
	if (TRANSLATIONS[lang]) {
		currentLang = lang;
		localStorage.setItem('br-lang', lang);
		translateDOM();
	}
}

export function getLanguage() {
	return currentLang;
}

export function t(path) {
	const keys = path.split('.');
	let value = TRANSLATIONS[currentLang];
	for (const key of keys) {
		value = value?.[key];
	}
	return value || path;
}

export function translateDOM() {
	document.querySelectorAll('[data-i18n]').forEach(el => {
		const key = el.dataset.i18n;
		const attr = el.dataset.i18nAttr;
		if (attr) {
			el.setAttribute(attr, t(key));
		} else {
			el.textContent = t(key);
		}
	});
}

window._setLang = setLanguage;
