/**
 * Lightweight internationalization for NebulaTraceX popup.
 */

const TRANSLATIONS = {
	en: {
		tabs: {
			recorder: 'Record',
			logs: 'Steps',
			export: 'Export',
			stats: 'Stats'
		},
		recorder: {
			ready: 'Ready to record',
			recording: 'Recording...',
			start_btn: 'Start Recording',
			stop_btn: 'Stop Recording',
			screenshot_btn: 'Capture Screenshot',
			session_prompt: 'Choose a tab to start...',
			note_label: 'Notes',
			note_placeholder: 'Describe bug or context... (auto-saved)',
			recent_steps: 'Recent Steps',
			empty_title: 'No steps yet',
			empty_desc: 'Click "Start Recording" and interact with the page'
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
		export: {
			format: 'Format',
			ai_prompt_label: 'AI Prompt',
			ai_prompt_desc: 'Copy this prompt to ChatGPT / Claude for bug analysis:',
			ai_prompt_copy: 'Copy prompt',
			ai_prompt_copied: 'Copied!',
			preview: 'Preview',
			btn_export: 'Export & Download',
			btn_exporting: 'Exporting...',
			btn_exported: 'Exported!',
			no_session: '(No session selected)',
			no_session_preview: '(Select a session and format to preview)'
		},
		stats: {
			skeleton_project: 'Allocated by Project',
			chart_title: 'Steps by Project',
			projects_label: 'Projects',
			btn_csv: 'CSV',
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
		}
	},
	vi: {
		tabs: {
			recorder: 'Ghi lại',
			logs: 'Các bước',
			export: 'Xuất dữ liệu',
			stats: 'Thống kê'
		},
		recorder: {
			ready: 'Sẵn sàng ghi',
			recording: 'Đang ghi...',
			start_btn: 'Bắt đầu ghi',
			stop_btn: 'Dừng ghi',
			screenshot_btn: 'Chụp ảnh màn hình',
			session_prompt: 'Chọn tab để bắt đầu...',
			note_label: 'Ghi chú',
			note_placeholder: 'Mô tả bug hoặc context... (lưu tự động)',
			recent_steps: 'Bước gần nhất',
			empty_title: 'Chưa có bước nào',
			empty_desc: 'Nhấn "Bắt đầu ghi" rồi thao tác trên trang web'
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
		export: {
			format: 'Định dạng',
			ai_prompt_label: 'AI Prompt',
			ai_prompt_desc: 'Copy prompt này vào ChatGPT / Claude để phân tích bug:',
			ai_prompt_copy: 'Copy prompt',
			ai_prompt_copied: 'Đã copy!',
			preview: 'Xem trước',
			btn_export: 'Xuất & Tải về',
			btn_exporting: 'Đang xuất...',
			btn_exported: 'Đã xuất!',
			no_session: '(Chưa có session nào)',
			no_session_preview: '(Chọn session và format để xem preview)'
		},
		stats: {
			skeleton_project: 'Phân bổ theo Project',
			chart_title: 'Bước theo Project',
			projects_label: 'Dự án',
			btn_csv: 'CSV',
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
