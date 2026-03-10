<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="antialiased">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>E-SPMI Enterprise</title>
    <meta name="theme-color" content="#0f766e">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="E-SPMI">
    <meta name="application-name" content="E-SPMI Enterprise">
    <meta name="description" content="Sistem Penjaminan Mutu Internal untuk standar, audit, dan eviden institusi.">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet" />

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body class="font-sans text-gray-900 bg-gray-50 dark:bg-gray-900 leading-normal tracking-normal transition-colors duration-200">
    <!-- React Mount Point -->
    <div id="app"></div>
</body>
</html>
