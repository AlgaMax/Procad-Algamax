#pragma once
#include <gtkmm/applicationwindow.h>
#include "canvas.hpp"
#include "nesting/thread_pool.hpp"
#include "ui/menu.hpp"

class MainWindow : public Gtk::ApplicationWindow {
public:
    MainWindow();
    ~MainWindow() override;
    
private:
    void create_layout();
    void setup_menu();
    void setup_signals();
    
    // UI Components
    Gtk::Box m_main_box;
    Canvas m_canvas;
    
    // Nesting components
    NestingThreadPool m_thread_pool{4, 32};
};

// application.cpp
#include "main_window.hpp"
#include <gtkmm/application.h>

int main(int argc, char* argv[]) {
    auto app = Gtk::Application::create("com.algamax.procad");
    return app->make_window_and_run<MainWindow>(argc, argv);
}
