"""
مركز المعلومات — Mersal Foundation Information Center
PySide6 Desktop Application
"""

import sys
from backend import DataBackend
from pathlib import Path
from PySide6.QtWidgets import QWidget, QFrame, QHBoxLayout, QVBoxLayout, QLabel
from PySide6.QtGui import QPixmap, QPainter, QPainterPath, QFont
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont, QColor, QPalette, QPainter, QBrush, QPen

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QGridLayout, QLabel, QPushButton, QComboBox, QDateEdit, QTableWidget,
    QTableWidgetItem, QHeaderView, QTabWidget, QFrame, QProgressBar,
    QScrollArea, QLineEdit, QGraphicsDropShadowEffect, QSizePolicy
)
from PySide6.QtCore import Qt, QDate
from PySide6.QtGui import QFont, QColor, QPalette, QCursor
from PySide6.QtCore import Qt, QDate
from PySide6.QtGui import QFont, QColor, QPalette, QCursor
import json
import pandas as pd

from PySide6.QtCharts import (
    QChart,
    QChartView,
    QBarSeries,
    QBarSet,
    QBarCategoryAxis,
    QValueAxis
)
from PySide6.QtCharts import (
    QChart, QChartView, QBarSeries, QBarSet,
    QBarCategoryAxis, QValueAxis
)
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtGui import QPainter

from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtGui import QPainter
from PySide6.QtCore import QTimer

from PySide6.QtGui import QColor, QPainter, QPixmap
from PySide6.QtCore import Qt, QByteArray
from PySide6.QtSvg import QSvgRenderer
# ── Data Loader ───────────────────────────────────────────────────────────────────


TEAL        = "#1F9A97"
TEAL_DARK   = "#177C79"
TEAL_LIGHT  = "#E6F5F5"
YELLOW      = "#F2B21B"
BG          = "#F4F6F9"
CARD_BG     = "#FFFFFF"
BORDER      = "#E2E8F0"
TEXT_DARK   = "#1A2332"
TEXT_MID    = "#4A5568"
TEXT_LIGHT  = "#94A3B8"
ROW_ALT     = "#F8FAFC"
RED         = "#E53E3E"
GREEN       = "#38A169"
ORANGE      = "#DD6B20"
BLUE        = "#3182CE"

FIELD_H     = 40   # ارتفاع ثابت لكل الحقول
BTN_H       = 40   # ارتفاع الأزرار

APP_STYLESHEET = f"""
QMainWindow, QWidget {{
    background-color: {BG};
    font-family: "Segoe UI", "Arial", sans-serif;
    font-size: 13px;
    color: {TEXT_DARK};
}}
/* ── Tabs ── */
QTabWidget::pane {{ border:none; background:transparent; padding-top:6px; }}
QTabBar::tab {{
    background:{CARD_BG}; color:{TEXT_MID};
    border:1px solid {BORDER}; border-bottom:none;
    padding:10px 28px; margin-right:4px;
    border-top-left-radius:8px; border-top-right-radius:8px;
    font-weight:500; font-size:13px;
}}
QTabBar::tab:selected {{ background:{TEAL}; color:white; font-weight:700; }}
QTabBar::tab:hover:!selected {{ background:{TEAL_LIGHT}; color:{TEAL}; }}

/* ── زر البحث — لون أصلي ── */
QPushButton#btn_search {{
    background-color: {TEAL};
    color: {TEXT_MID};
    border: 1px solid {BORDER};
    border-radius: 8px;
    padding: 0px 28px;
    font-size: 13px;
    font-weight: 700;
    min-height: {BTN_H}px;
    min-width: 140px;
}}
QPushButton#btn_search:hover  {{ background-color: {TEAL_DARK}; }}
QPushButton#btn_search:pressed {{ background-color: #135f5d; }}

/* ── زر المسح — لون أصلي ── */
QPushButton#btn_clear {{
    background-color: {CARD_BG};
    color: {TEXT_MID};
    border: 1px solid {BORDER};
    border-radius: 8px;
    padding: 0px 20px;
    font-size: 13px;
    font-weight: 600;
    min-height: {BTN_H}px;
}}
QPushButton#btn_clear:hover {{ background-color:#F1F5F9; color:{TEXT_DARK}; }}

/* ── Secondary ── */
QPushButton#secondary {{
    background:{CARD_BG}; color:{TEXT_MID};
    border:1px solid {BORDER}; border-radius:8px;
    padding:7px 18px; font-weight:600; font-size:13px;
}}
QPushButton#secondary:hover {{ background:#F1F5F9; color:{TEXT_DARK}; }}

/* ── LineEdit ── */
QLineEdit {{
    border:1.5px solid {BORDER}; border-radius:8px;
    padding:0px 12px; background:{CARD_BG};
    color:{TEXT_DARK}; font-size:13px;
    min-height:{FIELD_H}px; max-height:{FIELD_H}px;
}}
QLineEdit:focus {{ border:1.5px solid {TEAL}; }}

/* ── ComboBox ── */
QComboBox {{
    border:1.5px solid {BORDER}; border-radius:8px;
    padding:0px 12px; background:{CARD_BG};
    color:{TEXT_DARK}; font-size:13px;
    min-height:{FIELD_H}px; max-height:{FIELD_H}px;
}}
QComboBox:focus {{ border:1.5px solid {TEAL}; }}
QComboBox::drop-down {{ border:none; width:24px; }}
QComboBox::down-arrow {{ width:12px; height:12px; }}
QComboBox QAbstractItemView {{
    border:1px solid {BORDER}; border-radius:6px;
    background:{CARD_BG};
    selection-background-color:{TEAL_LIGHT};
    selection-color:{TEAL};
}}

/* ── DateEdit ── */
QDateEdit {{
    border:1.5px solid {BORDER}; border-radius:8px;
    padding:0px 12px; background:{CARD_BG};
    color:{TEXT_DARK}; font-size:13px;
    min-height:{FIELD_H}px; max-height:{FIELD_H}px;
}}
QDateEdit:focus {{ border:1.5px solid {TEAL}; }}
QDateEdit::drop-down {{ border:none; width:24px; }}

/* ── Table ── */
QTableWidget {{
    border:1px solid {BORDER}; border-radius:10px;
    background:{CARD_BG}; gridline-color:{BORDER};
    font-size:13px; outline:none;
    alternate-background-color:{ROW_ALT};
}}
QTableWidget::item {{ padding:8px 12px; border:none; }}
QTableWidget::item:selected {{ background-color:{TEAL_LIGHT}; color:{TEAL_DARK}; }}
QHeaderView::section {{
    background-color:{TEAL}; color:white; font-weight:700;
    font-size:13px; padding:10px 12px; border:none;
    border-right:1px solid {TEAL_DARK};
}}

/* ── Scrollbar ── */
QScrollBar:vertical {{ background:{BG}; width:8px; border-radius:4px; }}
QScrollBar::handle:vertical {{ background:#CBD5E0; border-radius:4px; min-height:30px; }}
QScrollBar::handle:vertical:hover {{ background:{TEAL}; }}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height:0; }}

/* ── Progress ── */
QProgressBar {{
    border:none; border-radius:6px; background:{BORDER};
    height:10px; color:transparent;
}}
QProgressBar::chunk {{ border-radius:6px; }}

QLabel {{ background:transparent; }}
"""


def make_card() -> QFrame:
    card = QFrame()
    card.setStyleSheet(f"""
        QFrame {{
            background-color:{CARD_BG};
            border:1px solid {BORDER};
            border-radius:12px;
        }}
    """)
    return card


def add_shadow(widget, blur=16, offset_y=3, opacity=0.09):
    sh = QGraphicsDropShadowEffect()
    sh.setBlurRadius(blur); sh.setOffset(0, offset_y)
    sh.setColor(QColor(0, 0, 0, int(255 * opacity)))
    widget.setGraphicsEffect(sh)


def section_title(text: str) -> QLabel:
    lbl = QLabel(text)
    f = QFont(); f.setPointSize(13); f.setWeight(QFont.Weight.Bold)
    lbl.setFont(f); lbl.setStyleSheet(f"color:{TEXT_DARK};background:transparent;")
    return lbl


def field_label(text: str) -> QLabel:
    lbl = QLabel(text)
    f = QFont(); f.setPointSize(10); f.setWeight(QFont.Weight.DemiBold)
    lbl.setFont(f); lbl.setStyleSheet(f"color:{TEXT_MID};background:transparent;")
    lbl.setFixedHeight(20)
    return lbl


def make_field_col(label_text: str, widget) -> QVBoxLayout:
    """Label + widget in a VBox, uniform spacing."""
    col = QVBoxLayout(); col.setSpacing(5); col.setContentsMargins(0,0,0,0)
    col.addWidget(field_label(label_text))
    widget.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
    col.addWidget(widget)
    return col
from PySide6.QtCore import QThread, Signal

class SearchWorker(QThread):
    finished = Signal(object)

    def __init__(self, backend, params):
        super().__init__()
        self.backend = backend
        self.params = params

    def run(self):
        results = self.backend.search(**self.params)
        self.finished.emit(results)

# ══════════════════════════════════════════════════════════════════════════════
class MainWindow(QMainWindow):
    def __init__(self):
        
        
        super().__init__()
        self.backend = DataBackend()
    
    
        self.setWindowTitle("مركز المعلومات — Mersal Foundation")
        self.resize(1400, 860)
        self.setStyleSheet(APP_STYLESHEET)

        root = QWidget()
        self.setCentralWidget(root)
        rl = QVBoxLayout(root)
        rl.setContentsMargins(0,0,0,0); rl.setSpacing(0)
        rl.addWidget(self._build_header())

        body = QWidget()
        bl = QVBoxLayout(body)
        bl.setContentsMargins(24,16,24,24); bl.setSpacing(0)
        self.tab_widget = QTabWidget()
        self.tab_widget.addTab(self._build_search_tab(),    "🔍  بحث  —  Search")
        self.tab_widget.addTab(self._build_dashboard_tab(), "📊  لوحة التحكم  —  Dashboard")
        bl.addWidget(self.tab_widget)
        rl.addWidget(body, 1)
    def do_search(self):
     params = {
        "code": self.input_code.text().strip(),
        "name": self.input_name.text().strip(),
        "id_type": self.cb_id_type.currentText(),
        "id_value": self.input_id.text().strip(),
        "nationality": self.cb_nat.currentText(),
        "asylum": self.cb_asylum.currentText(),
        "year_from": self.year_from.text().strip(),
        "year_to": self.year_to.text().strip(),
    }

     self.worker = SearchWorker(self.backend, params)
     self.worker.finished.connect(self.on_search_finished)
     self.count_lbl.setText("...")
     self.worker.start()
     
     
    def on_search_finished(self, results):
     self.show_results(results)

     dashboard = self.tab_widget.widget(1)
     code = self.input_code.text().strip()

     if code:
      df_services = self.backend.services_df.copy()
      df_services = df_services[
        df_services["C-Code"].astype(str).str.strip() == code
    ]

      dashboard.update_chart(df_services)
     else:
      dashboard.update_chart(self.backend.services_df)
     code = self.input_code.text().strip()

     if code:
        cases, services, cost = self.backend.calculate_stats(code)
        dashboard.update_stats(cases, services, cost)

     self.count_lbl.setText(str(len(results)))
    
     QTimer.singleShot(100, lambda: dashboard.update_map(results))
    def clear_filters(self):

    # 🟢 Text fields
     self.input_code.clear()
     self.input_name.clear()
     self.input_id.clear()
     self.year_from.clear()
     self.year_to.clear()

    # 🟢 ComboBoxes (ترجع لأول اختيار)
     self.cb_nat.setCurrentIndex(0)
     self.cb_asylum.setCurrentIndex(0)
     self.cb_id_type.setCurrentIndex(0)
     self.cb_service.setCurrentIndex(0)

    # 🟢 الجدول
     self.table.setRowCount(0)

    # 🟢 العداد
     self.count_lbl.setText("0")

    # 🟢 (اختياري) تصفير الداشبورد
     dashboard = self.tab_widget.widget(1)

     empty_df = __import__("pandas").DataFrame()

     dashboard.update_map(empty_df)
     if hasattr(dashboard, "update_chart"):
        dashboard.update_chart(empty_df)
        
        

    # ── Header ────────────────────────────────────────────────────────────────
  

    def _build_header(self) -> QWidget:
     header = QFrame()
     header.setFixedHeight(76)
     header.setStyleSheet(f"""
        QFrame {{
            background:qlineargradient(x1:0,y1:0,x2:1,y2:0,
                stop:0 {TEAL_DARK}, stop:0.6 {TEAL}, stop:1 #25B8B5);
            border-bottom:3px solid {YELLOW};
        }}
    """)
     lo = QHBoxLayout(header)
     lo.setContentsMargins(28, 0, 28, 0)
     lo.setSpacing(16)

    # --- Logo ---
     logo = QLabel()
     logo.setFixedSize(48, 48)
     logo.setAlignment(Qt.AlignmentFlag.AlignCenter)
     logo.setStyleSheet("background:transparent;")

     logo_path = Path(__file__).parent / "logo.webp"
     if logo_path.exists():
        pixmap = QPixmap(str(logo_path))
        size = 48
        rounded = QPixmap(size, size)
        rounded.fill(Qt.GlobalColor.transparent)
        painter = QPainter(rounded)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        path = QPainterPath()
        path.addEllipse(0, 0, size, size)
        painter.setClipPath(path)
        painter.drawPixmap(0, 0, pixmap.scaled(
            size, size,
            Qt.AspectRatioMode.KeepAspectRatioByExpanding,
            Qt.TransformationMode.SmoothTransformation
        ))
        painter.end()
        logo.setPixmap(rounded)
     else:
        # Fallback لو الصورة مش موجودة
        logo.setText("M")
        logo.setStyleSheet(f"""
            background:{YELLOW};
            color:{TEXT_DARK};
            border-radius:24px;
            font-size:22px;
            font-weight:800;
        """)

     lo.addWidget(logo)

    # --- Text ---
     tb = QVBoxLayout()
     tb.setSpacing(2)

     t = QLabel("مركز المعلومات")
     tf = QFont()
     tf.setPointSize(18)
     tf.setWeight(QFont.Weight.Bold)
     t.setFont(tf)
     t.setStyleSheet("color:white; background:transparent;")

     s = QLabel("Mersal Foundation")
     sf = QFont()
     sf.setPointSize(11)
     s.setFont(sf)
     s.setStyleSheet("color:rgba(255,255,255,0.75); background:transparent;")

     tb.addWidget(t)
     tb.addWidget(s)
     lo.addLayout(tb)
     lo.addStretch()

    # --- Version ---
     ver = QLabel("Version 1.0.0")
     vf = QFont()
     vf.setPointSize(10)
     ver.setFont(vf)
     ver.setStyleSheet("color:rgba(255,255,255,0.55); background:transparent;")
     lo.addWidget(ver)

     return header

    # ── Search Tab ────────────────────────────────────────────────────────────
    def _build_search_tab(self) -> QWidget:
        w = QWidget()
        vl = QVBoxLayout(w)
        vl.setContentsMargins(0,12,0,0); vl.setSpacing(16)
        vl.addWidget(self._build_filter_section())
        vl.addWidget(self._build_results_section())
        return w

    # ── Filter Section ────────────────────────────────────────────────────────
    def _build_filter_section(self) -> QWidget:
        wrapper = QWidget()
        wrapper.setStyleSheet("background:transparent;")
        outer = QVBoxLayout(wrapper)
        outer.setContentsMargins(0,0,0,0); outer.setSpacing(12)

        # ── Green title bar ──
        title_bar = QFrame(); title_bar.setFixedHeight(46)
        title_bar.setStyleSheet(f"""
            QFrame {{
                background:qlineargradient(x1:0,y1:0,x2:1,y2:0,
                    stop:0 {TEAL}, stop:1 #25B8B5);
                border-radius:10px;
            }}
        """)
        tbl = QHBoxLayout(title_bar); tbl.setContentsMargins(18,0,18,0)
        tl = QLabel("🔍  بحث بيانات الحالة  —  Search Filters")
        tf = QFont(); tf.setPointSize(12); tf.setWeight(QFont.Weight.Bold); tl.setFont(tf)
        tl.setStyleSheet("color:white;background:transparent;")
        tbl.addWidget(tl); tbl.addStretch()
        outer.addWidget(title_bar)

        # ═══ Row 1: الكود | الاسم | الخدمة | ID Number (dropdown) ═══
        row1 = QHBoxLayout(); row1.setSpacing(12)

        # الكود — LineEdit
        self.input_code = QLineEdit()
        self.input_code.setPlaceholderText("e.g.  C-003")
        row1.addLayout(make_field_col("الكود", self.input_code))

        # الاسم — LineEdit
        self.input_name = QLineEdit()
        self.input_name.setPlaceholderText("ابحث بالاسم ...")
        row1.addLayout(make_field_col("الاسم", self.input_name))

        # الخدمة — ComboBox
        self.cb_service = QComboBox()
        self.cb_service.addItems(["— اختر الخدمة —", "ادوية", "كفالات", "اورام", "طوارئ", "اسعاف" , "PKU"])
        row1.addLayout(make_field_col("الخدمة", self.cb_service))
        self.input_id = QLineEdit()
        self.input_id.setPlaceholderText("ادخل الرقم ...")

        row1.addLayout(make_field_col("ID Value", self.input_id))

        # ID Number — ComboBox (dropdown بالأنواع)
        self.cb_id_type = QComboBox()
        self.cb_id_type.addItems([
    "— نوع الرقم —",
    "الرقم القومي",
    "رقم المفاوضية للفرد",
    "رقم المفاوضية للأسرة",
    "رقم كارت المفاوضية",
])
        row1.addLayout(make_field_col("ID Number  —  رقم التعريف", self.cb_id_type))

        outer.addLayout(row1)

        # ═══ Row 2: الجنسية | موقف اللجوء | من تاريخ | إلى تاريخ ═══
        row2 = QHBoxLayout(); row2.setSpacing(12)

        # الجنسية
        self.cb_nat = QComboBox()
        self.cb_nat.addItems(["— اختر الجنسية —", "أثيوبى", "اردنى", "إريترى", "افريقي وسطي", "افغانستان", "السنغال", "سوداني" , "مصري" , "سورى"])
        row2.addLayout(make_field_col("الجنسية  —  Nationality", self.cb_nat))

        # موقف اللجوء
        self.cb_asylum = QComboBox()
        self.cb_asylum.addItems(["— اختر الموقف —", "لاجئ","غير لاجئ", "مواطن"])
        row2.addLayout(make_field_col("موقف اللجوء  —  Asylum Status", self.cb_asylum))
      # السنة من
        self.year_from = QLineEdit()
        self.year_from.setPlaceholderText("")

        row2.addLayout(make_field_col("السنة من — Year From", self.year_from))


    # السنة إلى
        self.year_to = QLineEdit()
        self.year_to.setPlaceholderText("مثال: 2023")

        row2.addLayout(make_field_col("السنة إلى — Year To", self.year_to))

        outer.addLayout(row2)

        # ═══ Buttons row ═══
        btn_row = QHBoxLayout(); btn_row.setSpacing(10)
        btn_row.addStretch()

        btn_clear = QPushButton("✕   مسح الكل  —  Clear")
        btn_clear.setObjectName("btn_clear")
        btn_clear.clicked.connect(self.clear_filters)
        btn_clear.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        btn_clear.setFixedHeight(BTN_H)

        btn_search = QPushButton("🔍   بحث الآن  —  Search")
        btn_search.clicked.connect(self.do_search)
        btn_search.setObjectName("btn_search")
        btn_search.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        btn_search.setFixedHeight(BTN_H)

        btn_row.addWidget(btn_clear)
        btn_row.addWidget(btn_search)
        outer.addLayout(btn_row)
        self.input_code.returnPressed.connect(self.do_search)
        self.input_name.returnPressed.connect(self.do_search)
        self.input_id.returnPressed.connect(self.do_search)
        self.year_from.returnPressed.connect(self.do_search)
        self.year_to.returnPressed.connect(self.do_search)
        
        return wrapper

    # ── Results ───────────────────────────────────────────────────────────────
    def _build_results_section(self) -> QWidget:
        w = QWidget()
        vb = QVBoxLayout(w); vb.setContentsMargins(0,0,0,0); vb.setSpacing(10)

        rr = QHBoxLayout()
        fl = QLabel("تم العثور على  "); fl.setStyleSheet(f"color:{TEXT_MID};")
        self.count_lbl = QLabel("0")
        self.count_lbl.setStyleSheet(f"""
            color:white; background:{TEAL}; border-radius:10px;
            padding:2px 10px; font-weight:700; font-size:13px;
        """)
        rl2 = QLabel("  نتيجة  —  results"); rl2.setStyleSheet(f"color:{TEXT_MID};")
        rr.addWidget(fl); rr.addWidget(self.count_lbl); rr.addWidget(rl2); rr.addStretch()
        exp = QPushButton("⬇  تصدير  —  Export")
        exp.setObjectName("secondary"); exp.setFixedHeight(34)
        exp.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        rr.addWidget(exp)
        vb.addLayout(rr)
        vb.addWidget(self._build_table())
        return w

    def _build_table(self) -> QTableWidget:
     columns = [
        "الكود", "الاسم", "العمر", "تاريخ الميلاد",
        "الرقم القومي", "رقم كارت المفاوضية للفرد",
        "رقم ملف المفاوضية", "كود المفاوضية", "موقف اللجوء", "الجنسية"
    ]
     self.table = QTableWidget(0, len(columns))
     self.table.setHorizontalHeaderLabels(columns)
     self.table.setAlternatingRowColors(True)
     self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
     self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
     self.table.verticalHeader().setVisible(False)
     self.table.setShowGrid(True)
     self.table.setSortingEnabled(False)
     self.table.verticalHeader().setDefaultSectionSize(42)

     h = self.table.horizontalHeader()
     h.setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
     h.setStretchLastSection(True)
     self.table.setMinimumHeight(320)

    # ✅ ربط الضغط على الصف
     self.table.itemSelectionChanged.connect(self._on_row_selected)

     return self.table
    def show_results(self, df):

     self.table.setRowCount(len(df))

     for row_idx, (_, row) in enumerate(df.iterrows()):

        self.table.setItem(row_idx, 0, QTableWidgetItem(str(row.get("C-Code",""))))
        self.table.setItem(row_idx, 1, QTableWidgetItem(str(row.get("Name",""))))
        self.table.setItem(row_idx, 2, QTableWidgetItem(str(row.get("Age",""))))
        self.table.setItem(row_idx, 3, QTableWidgetItem(str(row.get("تاريخ الميلاد",""))))
        self.table.setItem(row_idx, 4, QTableWidgetItem(str(row.get("الرقم القومى",""))))
        self.table.setItem(row_idx, 5, QTableWidgetItem(str(row.get("رقم كارت المفاوضية للفرد",""))))
        self.table.setItem(row_idx, 6, QTableWidgetItem(str(row.get("رقم ملف المفاوضية",""))))
        self.table.setItem(row_idx, 7, QTableWidgetItem(str(row.get("كود المفاوضية",""))))
        self.table.setItem(row_idx, 8, QTableWidgetItem(str(row.get("موقف اللجوء",""))))
        self.table.setItem(row_idx, 9, QTableWidgetItem(str(row.get("الجنسية",""))))
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)

     self.count_lbl.setText(str(len(df)))
    def _on_row_selected(self):
     selected = self.table.selectedItems()
     if not selected:
        return

     row = self.table.currentRow()
     code_item = self.table.item(row, 0)
     if not code_item:
        return

     code = code_item.text().strip()
     if not code:
        return

     dashboard = self.tab_widget.widget(1)

    # ✅ تحديث الإحصائيات
     cases, services, cost = self.backend.calculate_stats(code)
     dashboard.update_stats(cases, services, cost)

    # ✅ تحديث الشارت
     df_services = self.backend.services_df.copy()
     df_services = df_services[
        df_services["C-Code"].astype(str).str.strip() == code
    ]
     dashboard.update_chart(df_services)

    # ✅ تحديث الخريطة — نعمل df من صف واحد من cases
     df_cases = self.backend.cases_df.copy()
     df_row = df_cases[df_cases["C-Code"].astype(str).str.strip() == code]
     QTimer.singleShot(100, lambda: dashboard.update_map(df_row))

   
     
        # ── Dashboard Tab ─────────────────────────────────────────
    def _build_dashboard_tab(self):
        return DashboardWidget()
   

PURPLE = "#805AD5"

MAP_HTML = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { width:100%; height:100%; margin:0; padding:0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [26.8, 30.8], zoom: 6,
      zoomControl: true, scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', maxZoom: 18
    }).addTo(map);

    var markers = [];

    function updateMap(data) {
      markers.forEach(function(m) { map.removeLayer(m); });
      markers = [];

      if (data.length > 0) {
        map.setView([data[0].lat, data[0].lng], 5);
      }

      data.forEach(function(g) {
        var size = Math.sqrt(g.cases) * 3 + 28;

        var svgIcon = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.3}"
               viewBox="0 0 40 52">
            <defs>
              <filter id="shadow" x="-30%" y="-10%" width="160%" height="160%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)"/>
              </filter>
            </defs>
            <path d="M20 2 C10 2 2 10 2 20 C2 32 20 50 20 50 C20 50 38 32 38 20 C38 10 30 2 20 2 Z"
                  fill="${g.color}" filter="url(#shadow)"/>
            <circle cx="20" cy="20" r="8" fill="white" opacity="0.9"/>
            <circle cx="20" cy="20" r="4" fill="${g.color}"/>
          </svg>`;

        var icon = L.divIcon({
          html: svgIcon,
          className: '',
          iconSize: [size, size * 1.3],
          iconAnchor: [size / 2, size * 1.3],
          popupAnchor: [0, -size]
        });

        var marker = L.marker([g.lat, g.lng], { icon: icon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:Arial;font-size:13px;min-width:140px;">
            <b style="font-size:14px;">${g.name}</b><br/>
            <span style="color:#666;">عدد الحالات:</span>
            <b style="color:#1F9A97;">${g.cases}</b>
          </div>
        `);
        markers.push(marker);
      });
    }
  </script>
</body>
</html>
"""
 
def add_shadow(w, blur=20, y=4, op=0.10):
    s = QGraphicsDropShadowEffect()
    s.setBlurRadius(blur); s.setOffset(0, y)
    s.setColor(QColor(0, 0, 0, int(255 * op)))
    w.setGraphicsEffect(s)
 
 
def lbl(text, size=12, bold=False, color=TEXT_DARK) -> QLabel:
    l = QLabel(text)
    f = QFont("Segoe UI"); f.setPointSize(size)
    if bold: f.setWeight(QFont.Weight.Bold)
    l.setFont(f)
    l.setStyleSheet(f"color:{color};background:transparent;")
    return l

SVG_PERSON = """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="8" r="4" fill="{color}" opacity="0.25"/>
  <circle cx="12" cy="8" r="4" stroke="{color}" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
    stroke="{color}" stroke-width="1.8" stroke-linecap="round"
    fill="{color}" fill-opacity="0.15"/>
</svg>"""

SVG_PULSE = """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 12h3l3-8 4 16 3-10 2 4 3-2h2"
    stroke="{color}" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="19" cy="12" r="2" fill="{color}" opacity="0.4"/>
</svg>"""

SVG_COIN = """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="9" fill="{color}" fill-opacity="0.2"
    stroke="{color}" stroke-width="1.8"/>
  <path d="M14.5 9.5A2.5 2.5 0 0 0 12 7h-1a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-1.5A2.5 2.5 0 0 1 9 12.5"
    stroke="{color}" stroke-width="1.7" stroke-linecap="round"/>
  <line x1="12" y1="5.5" x2="12" y2="7.5"
    stroke="{color}" stroke-width="1.7" stroke-linecap="round"/>
  <line x1="12" y1="16.5" x2="12" y2="18.5"
    stroke="{color}" stroke-width="1.7" stroke-linecap="round"/>
</svg>"""
def _svg_pixmap(svg, color, size=32):
    from PySide6.QtSvg import QSvgRenderer
    from PySide6.QtCore import QByteArray, Qt
    from PySide6.QtGui import QPixmap, QPainter

    # 🟢 نحط اللون جوه SVG
    colored_svg = svg.format(color=color)

    pixmap = QPixmap(size, size)
    pixmap.fill(Qt.transparent)

    renderer = QSvgRenderer(QByteArray(colored_svg.encode()))
    painter = QPainter(pixmap)
    renderer.render(painter)
    painter.end()

    return pixmap
class DashboardWidget(QWidget):
    """
    Full-page dashboard:
      • 5 stat cards (top row)
      • Bar chart (bottom-left, 55% width)
      • Egypt map  (bottom-right, 45% width)
      
    """
    
    def update_map(self, df):
     if df.empty:
        return

     counts = df["الجنسية"].value_counts().to_dict()

     locations = {
    "مصري": {"lat":26.8, "lng":30.8},       # مصر
    "سوداني": {"lat":15.6, "lng":32.5},     # السودان
    "سورى": {"lat":34.8, "lng":38.9},       # سوريا
"اردني": {"lat":31.9539, "lng":35.9106},  # عمان
"أثيوبي": {"lat":9.1, "lng":40.5},      # إثيوبيا
    "إريتري": {"lat":15.3, "lng":39.7},     # إريتريا
    "افغانستان": {"lat":33.9, "lng":67.7},  # أفغانستان
    "السنغال": {"lat":14.5, "lng":-14.5},   # السنغال
   }

     data = []
     for nat, val in counts.items():
        loc = locations.get(nat, {"lat":30.05, "lng":31.24})

        data.append({
            "name": nat,
            "cases": int(val),
            "lat": loc["lat"],
            "lng": loc["lng"],
            "color": "#1F9A97"
        })

     
     js = json.dumps(data, ensure_ascii=False)

    # 🔥 هنا السحر
     self.map_view.page().runJavaScript(f"updateMap({js})")
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet(f"background:{BG};")
 
        root = QVBoxLayout(self)
        root.setContentsMargins(20, 16, 20, 16)
        root.setSpacing(16)
 
        # ── Row 1: 5 stat cards ──
        root.addLayout(self._stat_row(), 0)
 
        # ── Row 2: chart + map ──
        bottom = QHBoxLayout()
        bottom.setSpacing(16)
        bottom.addWidget(self._bar_chart_card(), 55)
        bottom.addWidget(self._map_card(),       45)
        root.addLayout(bottom, 1)
 
    # ── 5 Stat Cards ──────────────────────────────────────────────────────────


# ── أيقونات SVG ───────────────────────────────────────────
   


    def _svg_pixmap(svg_tpl: str, color: str, size: int = 24) -> QPixmap:
    
     xml = svg_tpl.format(color=color).encode()
     renderer = QSvgRenderer(QByteArray(xml))
     px = QPixmap(size, size)
     px.fill(Qt.transparent)
     p = QPainter(px)
     p.setRenderHint(QPainter.Antialiasing)
     renderer.render(p)
     p.end()
     return px


    def _stat_row(self) -> QHBoxLayout:
     self.cards = {}

     stats = [
        ("عدد الحالات",    "cases",    SVG_PERSON, TEAL),
        ("عدد الخدمات",    "services", SVG_PULSE,  BLUE),
        ("إجمالي التكلفة", "cost",     SVG_COIN,   GREEN),
    ]

     row = QHBoxLayout()
     row.setSpacing(14)

     for title, key, svg, color in stats:
        card = self._stat_card(title, "0", svg, color)
        self.cards[key] = card
        row.addWidget(card, 1)

     return row


    def _stat_card(self, title, value, svg_tpl, color):
    # ── حساب لون الخلفية من اللون الأساسي ──
     bg_color = QColor(color)
     bg_color.setAlpha(30)
     bg_hex = f"rgba({bg_color.red()},{bg_color.green()},{bg_color.blue()},0.12)"

     card = QFrame()
     card.setObjectName("statCard")
     card.setStyleSheet(f"""
        QFrame#statCard {{
            background: {CARD_BG};
            border-radius: 16px;
            border: 1px solid {BORDER};
        }}
    """)
     card.setMinimumHeight(100)
     add_shadow(card, blur=24, y=6, op=0.07)

     root = QVBoxLayout(card)
     root.setContentsMargins(0, 0, 0, 0)
     root.setSpacing(0)

    # ── شريط لوني علوي ──
     bar = QFrame()
     bar.setFixedHeight(4)
     bar.setStyleSheet(
        f"background:{color}; border-radius:16px 16px 0 0; border:none;"
    )
     root.addWidget(bar)

    # ── المحتوى ──
     body = QHBoxLayout()
     body.setContentsMargins(16, 14, 16, 14)
     body.setSpacing(14)

    # أيقونة SVG
     icon_box = QLabel()
     icon_box.setFixedSize(46, 46)
     icon_box.setAlignment(Qt.AlignCenter)
     icon_box.setStyleSheet(f"""
        background: {bg_hex};
        border-radius: 12px;
        border: none;
    """)
     icon_box.setPixmap(_svg_pixmap(svg_tpl, color, 24))

    # نصوص
     text_col = QVBoxLayout()
     text_col.setSpacing(4)

     title_lbl = QLabel(title)
     title_lbl.setStyleSheet(f"color:{TEXT_MID}; font-size:12px; font-weight:500;")

     value_lbl = QLabel(value)
     value_lbl.setStyleSheet(f"color:{TEXT_DARK}; font-size:26px; font-weight:700;")

     card.value_label = value_lbl

     text_col.addWidget(title_lbl)
     text_col.addWidget(value_lbl)
     text_col.addStretch()

     body.addWidget(icon_box)
     body.addLayout(text_col)
     body.addStretch()

     root.addLayout(body)
     return card


    def update_stats(self, cases, services, cost):
     self.cards["cases"].value_label.setText(str(cases))
     self.cards["services"].value_label.setText(str(services))
     self.cards["cost"].value_label.setText(f"{cost:,.0f}")
    # ── Bar Chart ─────────────────────────────────────────────────────────────
    def _bar_chart_card(self) -> QFrame:
     card = QFrame()
     card.setStyleSheet(f"""
        QFrame {{
            background:{CARD_BG};
            border:1px solid {BORDER};
            border-radius:12px;
        }}
    """)
     add_shadow(card, blur=18, y=4, op=0.08)
     card.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)

     vb = QVBoxLayout(card)
     vb.setContentsMargins(20, 16, 20, 16)
     vb.setSpacing(8)

    # 🟢 العنوان
     th = QHBoxLayout()
     th.addWidget(lbl("تطور الخدمات عبر السنين", 13, True, TEXT_DARK))
     th.addStretch()
     th.addWidget(lbl("Services Over Years", 10, False, TEXT_LIGHT))
     vb.addLayout(th)

    # divider
     div = QFrame()
     div.setFrameShape(QFrame.Shape.HLine)
     div.setStyleSheet(f"color:{BORDER};")
     vb.addWidget(div)

    # 🟢 شارت فاضي مبدئي
     self.chart = QChart()
     self.chart.setBackgroundBrush(QBrush(QColor(CARD_BG)))
     self.chart.setBackgroundPen(QPen(Qt.PenStyle.NoPen))
     self.chart.legend().setVisible(False)

     self.chart_view = QChartView(self.chart)
     self.chart_view.setRenderHint(QPainter.RenderHint.Antialiasing)
     self.chart_view.setStyleSheet("background:transparent;border:none;")

     vb.addWidget(self.chart_view, 1)

     return card
    def update_chart(self, df):
    # ✅ مسح الشارت القديم دايماً
     self.chart = QChart()
     self.chart.setBackgroundBrush(QBrush(QColor(CARD_BG)))
     self.chart.setBackgroundPen(QPen(Qt.PenStyle.NoPen))
     self.chart.legend().setVisible(False)

     if df is None or df.empty:
        self.chart.setTitle("لا توجد بيانات")
        self.chart_view.setChart(self.chart)
        return

     service_col = "الملف"
     if service_col not in df.columns:
        self.chart.setTitle("خطأ: عمود الخدمة غير موجود")
        self.chart_view.setChart(self.chart)
        return

     df = df.copy()
     df[service_col] = df[service_col].astype(str).str.strip()
     service_counts = df[service_col].value_counts()

     if service_counts.empty:
        self.chart.setTitle("لا توجد خدمات لعرضها")
        self.chart_view.setChart(self.chart)
        return

     services = service_counts.index.tolist()
     values = service_counts.values.tolist()

     bar_set = QBarSet("عدد الخدمات")
     for v in values:
        bar_set.append(int(v))
     bar_set.setColor(QColor(TEAL))

     series = QBarSeries()
     series.append(bar_set)

     self.chart.addSeries(series)
     self.chart.setAnimationOptions(QChart.SeriesAnimations)
     self.chart.legend().setVisible(False)

     axis_x = QBarCategoryAxis()
     axis_x.append(services)
     self.chart.addAxis(axis_x, Qt.AlignBottom)
     series.attachAxis(axis_x)
 
     axis_y = QValueAxis()
     axis_y.setRange(0, max(values) + 2)
     self.chart.addAxis(axis_y, Qt.AlignLeft)
     series.attachAxis(axis_y)

     self.chart_view.setChart(self.chart)
    # ── Map Card ──────────────────────────────────────────────────────────────
    def _map_card(self) -> QFrame:
        card = QFrame()
        card.setStyleSheet(f"""
            QFrame {{
                background:{CARD_BG};
                border:1px solid {BORDER};
                border-radius:12px;
            }}
        """)
        add_shadow(card, blur=18, y=4, op=0.08)
        card.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
 
        vb = QVBoxLayout(card)
        vb.setContentsMargins(20, 16, 4, 16); vb.setSpacing(8)
 
        # title
        th = QHBoxLayout()
        th.addWidget(lbl("التوزيع الجغرافي للحالات", 13, True, TEXT_DARK))
        th.addStretch()
        th.addWidget(lbl("Geographic Distribution", 10, False, TEXT_LIGHT))
        vb.addLayout(th)
 
        div = QFrame(); div.setFrameShape(QFrame.Shape.HLine)
        div.setStyleSheet(f"color:{BORDER};"); vb.addWidget(div)
 
        # map
        self.map_view = QWebEngineView()
        self.map_view.setHtml(MAP_HTML)
        self.map_view.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.map_view.setStyleSheet("border:none; border-radius:8px;")
        vb.addWidget(self.map_view, 1)
 
        return card
    
 
# ══════════════════════════════════════════════════════════════════════════════
def main():
    app = QApplication(sys.argv); app.setStyle("Fusion")
    pal = QPalette()
    pal.setColor(QPalette.ColorRole.Window,          QColor(BG))
    pal.setColor(QPalette.ColorRole.WindowText,      QColor(TEXT_DARK))
    pal.setColor(QPalette.ColorRole.Base,            QColor(CARD_BG))
    pal.setColor(QPalette.ColorRole.AlternateBase,   QColor(ROW_ALT))
    pal.setColor(QPalette.ColorRole.Button,          QColor(CARD_BG))
    pal.setColor(QPalette.ColorRole.ButtonText,      QColor(TEXT_DARK))
    pal.setColor(QPalette.ColorRole.Highlight,       QColor(TEAL))
    pal.setColor(QPalette.ColorRole.HighlightedText, QColor("white"))
    app.setPalette(pal)
    w = MainWindow(); w.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()