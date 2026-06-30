<?php

namespace Config;

$routes = Services::routes();

if (file_exists(SYSTEMPATH . 'Config/Routes.php')) {
    require SYSTEMPATH . 'Config/Routes.php';
}

$routes->setDefaultNamespace('App\Controllers');
$routes->setDefaultController('Home');
$routes->setDefaultMethod('index');
$routes->setTranslateURIDashes(false);
$routes->set404Override();

// Public Catalog
$routes->get('rewards', 'RewardAdminController::publicCatalog');
$routes->get('telefonias', 'TelefoniaController::index');

// Auth
$routes->post('auth/login', 'AuthController::login');
$routes->post('auth/register', 'AuthController::register');

// Admin Auth
$routes->post('admin/auth/login', 'AdminAuthController::login');

// Protected Routes (User)
$routes->group('', ['filter' => 'auth'], function ($routes) {
    $routes->get('profile', 'ProfileController::getProfile');
    $routes->post('profile/set-pin', 'ProfileController::setPin');
    $routes->post('profile/verify-pin', 'ProfileController::verifyPin');
    $routes->get('user/rewards/(:num)', 'RedemptionController::rewardsHistory/$1');
    $routes->get('user/history', 'RedemptionController::history');
    $routes->post('redeem', 'RedemptionController::redeemReward');
    $routes->post('rewards/redeem', 'RedemptionController::redeemReward');
    $routes->post('codes/redeem', 'EntryCodeController::redeem');
});

// Admin Routes
$routes->group('admin', ['filter' => 'admin_auth'], function ($routes) {
    $routes->get('rewards', 'RewardAdminController::index');
    $routes->post('rewards', 'RewardAdminController::createReward');
    $routes->post('rewards/(:num)/update', 'RewardAdminController::updateReward/$1');
    $routes->post('rewards/(:num)/add-codes', 'RewardAdminController::addCodes/$1');
    $routes->delete('rewards/(:num)', 'RewardAdminController::deleteReward/$1');

    $routes->get('codes', 'RewardAdminController::listCodes');
    $routes->post('codes/bulk-delete', 'RewardAdminController::bulkDeleteCodes');
    $routes->post('codes/(:num)', 'RewardAdminController::updateCode/$1');
    $routes->delete('codes/(:num)', 'RewardAdminController::deleteCode/$1');
    
    $routes->get('rewards/(:num)/exclusions', 'RewardAdminController::getExclusions/$1');
    $routes->post('rewards/(:num)/exclusions', 'RewardAdminController::addExclusion/$1');
    $routes->delete('rewards/(:num)/exclusions/(:num)', 'RewardAdminController::removeExclusion/$1/$2');

    $routes->get('dashboard', 'DashboardAdminController::getStats');
    $routes->get('entry-codes/report', 'AdminEntryCodeController::usageReport');
    $routes->get('users', 'AdminUserController::index');
    $routes->post('users/bulk-upload', 'AdminUserController::bulkUpload');
    $routes->get('users/report', 'AdminUserController::userReport');
    $routes->post('users/migrate-passwords', 'AdminUserController::migratePasswords');
    $routes->get('users/upload-logs', 'AdminUserController::getUploadLogs');
    $routes->get('users/upload-logs/(:num)', 'AdminUserController::getUploadLogDetail/$1');
    $routes->get('users/upload-logs/(:num)/original-file', 'AdminUserController::downloadOriginalFile/$1');
    $routes->post('users', 'AdminUserController::create');
    $routes->post('users/(:num)', 'AdminUserController::update/$1');
    $routes->post('users/(:num)/toggle-block', 'AdminUserController::toggleBlock/$1');
    $routes->post('users/(:num)/reset-pin', 'AdminUserController::resetPin/$1');
    
    $routes->get('redemptions', 'AdminRedemptionsController::index');
    $routes->get('redemptions/pending', 'AdminRedemptionsController::pendingRewards');
    $routes->post('redemptions/(:num)/mark-sent', 'AdminRedemptionsController::markSent/$1');
    $routes->get('orders', 'AdminOrdersController::index');
    $routes->post('orders/(:num)/update', 'AdminOrdersController::updateOrder/$1');

    $routes->get('projects', 'AdminProjectController::index');
    $routes->post('projects', 'AdminProjectController::create');
    $routes->post('projects/(:num)', 'AdminProjectController::update/$1');
    $routes->delete('projects/(:num)', 'AdminProjectController::delete/$1');

    $routes->post('upload/reward-image', 'UploadController::uploadRewardImage');
    $routes->post('upload/template', 'UploadController::uploadTemplate');

    // Vigencias CRUD
    $routes->get('vigencias', 'AdminVigenciasController::index');
    $routes->post('vigencias', 'AdminVigenciasController::create');
    $routes->post('vigencias/(:num)', 'AdminVigenciasController::update/$1');
    $routes->delete('vigencias/(:num)', 'AdminVigenciasController::delete/$1');

    // Telefonias CRUD
    $routes->get('telefonias', 'TelefoniaController::adminIndex');
    $routes->post('telefonias', 'TelefoniaController::create');
    $routes->delete('telefonias/(:num)', 'TelefoniaController::delete/$1');
});

$routes->post('analytics/log', 'AnalyticsController::logVisit');

if (defined('ENVIRONMENT') && file_exists(APPPATH . 'Config/' . ENVIRONMENT . '/Routes.php')) {
    require APPPATH . 'Config/' . ENVIRONMENT . '/Routes.php';
}
