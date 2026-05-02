import sys
import os
import json
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QVBoxLayout, QHBoxLayout, QPushButton,
    QWidget, QLabel, QLineEdit, QComboBox, QDialog, QDialogButtonBox,
    QListWidget, QListWidgetItem, QMessageBox
)
from PyQt6.QtWebEngineWidgets import QWebEngineView
import folium


class MissionMap:
    def __init__(self):
        self.map = folium.Map(location=[49.743, 15.338], zoom_start=9)
        self.poi_list = []
        self.icon_dirs = {
            "Friend": "icons/friend",
            "Foe": "icons/foe",
            "Neutral": "icons/neutral"
        }
        self.load_pois()

    def add_poi_to_list(self, poi):
        self.poi_list.append(poi)
        self.save_pois()

    def add_poi_marker(self, poi): #přidá marker
        icon_path = os.path.join(self.icon_dirs.get(poi.affiliation, "icons/neutral"), "default.png")
        icon = folium.CustomIcon(icon_image=icon_path, icon_size=(32, 32))
        folium.Marker(
            location=[poi.lat, poi.lon],
            popup=f"{poi.affiliation.title()}: {poi.name}",
            icon=icon
        ).add_to(self.map)

    def refresh_map(self): #refresh mapy s momentálníma POI
        self.map = folium.Map(location=[49.743, 15.338], zoom_start=9)
        for poi in self.poi_list:
            self.add_poi_marker(poi)
        self.save_map()

    def save_map(self, filename="map.html"):
        self.map.save(filename)

    def save_pois(self, filename="pois.json"):
        with open(filename, "w") as f:
            json.dump([poi.to_dict() for poi in self.poi_list], f, indent=4)

    def load_pois(self, filename="pois.json"):
        if os.path.exists(filename):
            with open(filename, "r") as f:
                data = json.load(f)
                self.poi_list = [PointOfInterest.from_dict(poi) for poi in data]
                self.refresh_map()


class CommandCenterGUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Mission Briefing System")
        self.map_handler = MissionMap()

        #layout
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        main_layout = QVBoxLayout(self.central_widget)

        #zobrazení mapy
        self.map_view = QWebEngineView()
        self.map_view.setHtml(open("map.html").read())
        main_layout.addWidget(self.map_view, 2)

        #panel
        self.control_panel = QVBoxLayout()
        main_layout.addLayout(self.control_panel, 1)

        #buttons
        self.buttons_layout = QHBoxLayout()

        self.add_poi_button = QPushButton("Add Point of Interest")
        self.add_poi_button.clicked.connect(self.open_add_poi_dialog)
        self.buttons_layout.addWidget(self.add_poi_button)

        self.manage_pois_button = QPushButton("Manage POIs")
        self.manage_pois_button.clicked.connect(self.open_manage_poi_dialog)
        self.buttons_layout.addWidget(self.manage_pois_button)

        self.refresh_button = QPushButton("Refresh Map")
        self.refresh_button.clicked.connect(self.refresh_map)
        self.buttons_layout.addWidget(self.refresh_button)

        self.control_panel.addLayout(self.buttons_layout)

        #otevření v maximalizování
        self.showMaximized()

    def open_add_poi_dialog(self): #přidávání PIO
        dialog = AddPOIDialog()
        if dialog.exec():
            poi = dialog.get_poi()
            if poi:
                self.map_handler.add_poi_to_list(poi)
                self.map_handler.refresh_map()
                self.map_view.setHtml(open("map.html").read())

    def open_manage_poi_dialog(self): #spravování POI
        def update_and_refresh():
            self.map_handler.save_pois()
            self.map_handler.refresh_map()
            self.map_view.setHtml(open("map.html").read())

        dialog = ManagePOIDialog(self.map_handler.poi_list, update_and_refresh)
        if dialog.exec():
            self.map_handler.poi_list = dialog.get_updated_pois()
            update_and_refresh()

    def refresh_map(self): #manuální refresh
        self.map_handler.refresh_map()
        self.map_view.setHtml(open("map.html").read())


class PointOfInterest: #třída PIO
    def __init__(self, name, lat, lon, affiliation):
        self.name = name
        self.lat = lat
        self.lon = lon
        self.affiliation = affiliation

    def to_dict(self): #převedení do slovníku
        return {
            "name": self.name,
            "lat": self.lat,
            "lon": self.lon,
            "affiliation": self.affiliation
        }

    @staticmethod #tvorba POI ze slovníku
    def from_dict(data):
        return PointOfInterest(
            data["name"],
            data["lat"],
            data["lon"],
            data["affiliation"]
        )


class AddPOIDialog(QDialog): #okno přidání PIO
    def __init__(self, poi=None):
        super().__init__()
        self.setWindowTitle("Add/Edit Point of Interest")
        self.layout = QVBoxLayout()

        #kolonka Jméno
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Name")
        self.layout.addWidget(QLabel("POI Name:"))
        self.layout.addWidget(self.name_input)

        #kolonka Šířky
        self.lat_input = QLineEdit()
        self.lat_input.setPlaceholderText("Latitude")
        self.layout.addWidget(QLabel("Latitude:"))
        self.layout.addWidget(self.lat_input)

        #kolonka Délky
        self.lon_input = QLineEdit()
        self.lon_input.setPlaceholderText("Longitude")
        self.layout.addWidget(QLabel("Longitude:"))
        self.layout.addWidget(self.lon_input)

        #dropdown Příslušnosti
        self.affiliation_input = QComboBox()
        self.affiliation_input.addItems(["Friend", "Foe", "Neutral"])
        self.layout.addWidget(QLabel("Affiliation:"))
        self.layout.addWidget(self.affiliation_input)

        if poi: #vyplnění při editování
            self.name_input.setText(poi.name)
            self.lat_input.setText(str(poi.lat))
            self.lon_input.setText(str(poi.lon))
            self.affiliation_input.setCurrentText(poi.affiliation)

        #OK/zrušit tlačítka
        self.buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        self.buttons.accepted.connect(self.accept)
        self.buttons.rejected.connect(self.reject)
        self.layout.addWidget(self.buttons)

        self.setLayout(self.layout)

    def get_poi(self): #get PIO z inputu
        try:
            name = self.name_input.text()
            lat = float(self.lat_input.text())
            lon = float(self.lon_input.text())
            affiliation = self.affiliation_input.currentText()
            return PointOfInterest(name, lat, lon, affiliation)
        except ValueError:
            print("Invalid input. Please check coordinates.")
            return None


class ManagePOIDialog(QDialog): #okno správy PIO
    def __init__(self, poi_list, refresh_callback):
        super().__init__()
        self.setWindowTitle("Manage Points of Interest")
        self.resize(400, 400)
        self.poi_list = [poi for poi in poi_list]  # Copy
        self.refresh_callback = refresh_callback

        layout = QVBoxLayout()

        #seznam POI
        self.list_widget = QListWidget()
        self.load_pois()
        layout.addWidget(self.list_widget)

        #Edit/Delete tlačítka
        buttons = QHBoxLayout()
        self.edit_button = QPushButton("Edit")
        self.edit_button.clicked.connect(self.edit_poi)
        buttons.addWidget(self.edit_button)

        self.delete_button = QPushButton("Delete")
        self.delete_button.clicked.connect(self.delete_poi)
        buttons.addWidget(self.delete_button)

        #OK/Zrušit tlačítka
        layout.addLayout(buttons)
        close_btns = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        close_btns.accepted.connect(self.accept)
        close_btns.rejected.connect(self.reject)
        layout.addWidget(close_btns)

        self.setLayout(layout)

    def load_pois(self): #zobrazení POI v seznamu
        self.list_widget.clear()
        for poi in self.poi_list:
            item = QListWidgetItem(f"{poi.name} ({poi.affiliation}) [{poi.lat}, {poi.lon}]")
            self.list_widget.addItem(item)

    def edit_poi(self): #editor POI
        index = self.list_widget.currentRow()
        if index < 0:
            return
        dialog = AddPOIDialog(self.poi_list[index])
        if dialog.exec():
            edited_poi = dialog.get_poi()
            if edited_poi:
                self.poi_list[index] = edited_poi
                self.load_pois()
                self.refresh_callback()

    def delete_poi(self): #smazat vybrané
        index = self.list_widget.currentRow()
        if index < 0:
            return
        reply = QMessageBox.question(self, "Delete POI",
                                     "Are you sure you want to delete this point of interest?",
                                     QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if reply == QMessageBox.StandardButton.Yes:
            del self.poi_list[index]
            self.load_pois()
            self.refresh_callback()

    def get_updated_pois(self): #return updatetnutýho seznamu na hlavní okno
        return self.poi_list


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = CommandCenterGUI()
    window.show()
    sys.exit(app.exec())
