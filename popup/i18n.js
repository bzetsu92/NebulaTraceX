/**
 * Lightweight internationalization for NebulaTraceX popup.
 */

const TRANSLATIONS = {
	en: {
		tabs: {
			home: 'HOME',
			trace: 'TRACE',
			settings: 'CONFIG'
		},
		recorder: {
			recording: 'Recording...',
			ready: 'Ready to record',
			start_btn: 'RECORDING',
			stop_btn: 'STOP',
			screenshot_btn: 'Capture Screenshot',
			session_prompt: 'Choose a tab to start...',
			note_label: 'Notes',
			note_placeholder: 'Describe bug or context... (auto-saved)',
			empty_title: 'No steps yet',
			empty_desc: 'Click "Start Recording" and interact with the page'
		},
		trace: {
			search_placeholder: 'Search sessions...',
			empty: 'No sites yet',
			view: 'View',
			back: '←',
			sessions: 'Sessions',
			steps: 'Steps',
			delete_all: 'Delete all',
			delete_all_confirm: 'Delete all sessions? This cannot be undone.',
			delete_steps: 'Delete steps',
			delete_networks: 'Delete networks',
			delete_images: 'Delete images',
			delete_confirm: 'Delete selected items? This cannot be undone.',
			session_hint: 'Use the dropdown above to switch sessions.',
			export_title: 'Export',
			export_md: 'Download MD',
			export_json: 'Download JSON',
			export_copy: 'COPY',
			export_download: 'Download',
			export_include_images: 'Include screenshots (data URL)',
			export_preview_empty: 'Select a session to preview export',
			close: 'Close',
			image_note: 'Add a note for this image...',
			open_window: 'Open Editor',
			pen: 'Pen',
			text: 'Text',
			clear: 'Clear',
			zoom_in: '+',
			zoom_out: '-',
			zoom_reset: '100%',
			download: 'Download',
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
		common: {
			copy: 'Copy',
			copied: 'Copied!',
			no_data: 'No data yet',
			unknown_url: 'Unknown URL'
		},
		settings: {
			title: 'Settings',
			desc: 'This section will contain preferences and advanced options.',
			step_title: 'Filter Step / UI',
			presets_title: 'Noise Filter Presets',
			presets_desc: 'Quick toggles for UI frameworks that generate overlay/tooltip noise.',
			preset_ant: 'Ant Design',
			preset_mui: 'MUI',
			preset_radix: 'Radix UI',
			preset_headlessui: 'Headless UI',
			preset_tailwindui: 'Tailwind UI',
			preset_shopify: 'Shopify Polaris',
			network_title: 'Network Rules',
			network_desc: 'Control which network calls are captured and how much data is stored.',
			network_presets: 'Network presets',
			net_preset_sentry: 'Sentry',
			net_preset_segment: 'Segment',
			net_preset_mixpanel: 'Mixpanel',
			blocked_hosts: 'Blocked hosts (patterns)',
			blocked_hosts_ph: 'analytics.google.com, doubleclick',
			ignore_urls: 'Ignore URL patterns',
			ignore_urls_ph: '\\\\.svg$, tracking',
			ignore_exts: 'Ignore extensions',
			ignore_exts_ph: 'png, jpg, svg, css',
			ignore_methods: 'Ignore methods',
			ignore_methods_ph: 'OPTIONS, HEAD',
			capture_methods: 'Capture body methods',
			capture_methods_ph: 'POST, PUT, PATCH',
			max_url: 'Max URL length',
			max_body: 'Max body length',
			max_form_keys: 'Max form keys',
			save: 'Save',
			reset: 'Reset',
			saved: 'Saved',
			config_title: 'Config Share',
			config_desc: 'Export or import a rule set to share with your team.',
			config_ph: '{...}',
			export: 'Export',
			import: 'Import',
			invalid_json: 'Invalid JSON'
		}
	},
	vi: {
		tabs: {
			home: 'HOME',
			trace: 'TRACE',
			settings: 'CONFIG'
		},
		recorder: {
			recording: 'Đang ghi...',
			ready: 'Sẵn sàng ghi',
			start_btn: 'Bắt đầu ghi',
			stop_btn: 'Dừng ghi',
			screenshot_btn: 'Chụp ảnh màn hình',
			session_prompt: 'Chọn tab để bắt đầu...',
			note_label: 'Ghi chú',
			note_placeholder: 'Mô tả bug hoặc context... (lưu tự động)',
			empty_title: 'Chưa có bước nào',
			empty_desc: 'Nhấn "Bắt đầu ghi" rồi thao tác trên trang web'
		},
		trace: {
			search_placeholder: 'Tìm session...',
			empty: 'Chưa có site nào',
			view: 'Xem',
			back: '←',
			sessions: 'Phiên',
			steps: 'Bước',
			delete_all: 'Xoá tất cả',
			delete_all_confirm: 'Xoá toàn bộ phiên? Không thể hoàn tác.',
			delete_steps: 'Xóa steps',
			delete_networks: 'Xóa networks',
			delete_images: 'Xóa images',
			delete_confirm: 'Xóa các mục đã chọn? Không thể hoàn tác.',
			session_hint: 'Dùng dropdown phía trên để đổi session.',
			export_title: 'Xuất',
			export_md: 'Tải MD',
			export_json: 'Tải JSON',
			export_copy: 'COPY',
			export_download: 'Tải xuống',
			export_include_images: 'Đính kèm ảnh (data URL)',
			export_preview_empty: 'Chọn session để xem trước bản xuất',
			close: 'Đóng',
			image_note: 'Ghi chú cho ảnh này...',
			open_window: 'Mở trình sửa',
			pen: 'Bút',
			text: 'Chữ',
			clear: 'Xoá',
			zoom_in: '+',
			zoom_out: '-',
			zoom_reset: '100%',
			download: 'Tải ảnh',
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
		common: {
			copy: 'Copy',
			copied: 'Đã copy!',
			no_data: 'Chưa có dữ liệu',
			unknown_url: 'Không rõ URL'
		},
		settings: {
			title: 'Cài đặt',
			desc: 'Khu vực này sẽ chứa tuỳ chọn và thiết lập nâng cao.',
			step_title: 'Step / UI Filters',
			presets_title: 'Preset lọc noise',
			presets_desc: 'Bật/tắt nhanh các UI framework hay tạo overlay/tooltip.',
			preset_ant: 'Ant Design',
			preset_mui: 'MUI',
			preset_radix: 'Radix UI',
			preset_headlessui: 'Headless UI',
			preset_tailwindui: 'Tailwind UI',
			preset_shopify: 'Shopify Polaris',
			network_title: 'Quy tắc Network',
			network_desc: 'Điều khiển những request được ghi và giới hạn dữ liệu lưu.',
			network_presets: 'Preset network',
			net_preset_sentry: 'Sentry',
			net_preset_segment: 'Segment',
			net_preset_mixpanel: 'Mixpanel',
			blocked_hosts: 'Chặn host (pattern)',
			blocked_hosts_ph: 'analytics.google.com, doubleclick',
			ignore_urls: 'Bỏ qua URL pattern',
			ignore_urls_ph: '\\\\.svg$, tracking',
			ignore_exts: 'Bỏ qua đuôi file',
			ignore_exts_ph: 'png, jpg, svg, css',
			ignore_methods: 'Bỏ qua method',
			ignore_methods_ph: 'OPTIONS, HEAD',
			capture_methods: 'Method có body',
			capture_methods_ph: 'POST, PUT, PATCH',
			max_url: 'Độ dài URL tối đa',
			max_body: 'Độ dài body tối đa',
			max_form_keys: 'Số key form tối đa',
			save: 'Lưu',
			reset: 'Reset',
			saved: 'Đã lưu',
			config_title: 'Chia sẻ cấu hình',
			config_desc: 'Xuất/nhập rule set để chia sẻ với team.',
			config_ph: '{...}',
			export: 'Xuất',
			import: 'Nhập',
			invalid_json: 'JSON không hợp lệ'
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
