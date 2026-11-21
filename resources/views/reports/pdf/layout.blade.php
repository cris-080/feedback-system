<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>@yield('title', 'CLSU Feedback Report')</title>
    <style>
        @page {
            margin: 10mm 13mm 15mm 13mm;
        }

        body {
            font-family: "DejaVu Sans", sans-serif;
            font-size: 9px;
            color: #000000;
            line-height: 1.25;
            margin: 0;
            padding: 0;
        }

        .page-footer {
            position: fixed;
            bottom: -9mm;
            left: 0;
            right: 0;
            text-align: left;
            font-size: 8px;
            font-style: italic;
            color: #222222;
        }

        .watermark {
            position: fixed;
            top: 42%;
            left: -30%;
            width: 160%;
            text-align: center;
            font-size: 72px;
            font-weight: bold;
            color: #dcdcdc;
            letter-spacing: 2px;
            white-space: nowrap;
            transform: rotate(-45deg);
            transform-origin: center center;
            z-index: -1000;
        }

        body.has-watermark table.data-table th,
        body.has-watermark table.data-table tr.subhead td,
        body.has-watermark table.data-table tr.total-row td {
            background-color: transparent;
        }

        /* Official CLSU Header */
        .header-wrapper {
            width: 100%;
            text-align: center;
            margin-bottom: 8px;
        }

        .logotype-img {
            width: 100%;
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
        }

        .univ-title {
            font-family: "DejaVu Serif", serif;
            font-size: 20px;
            font-weight: bold;
            color: #007A33;
            line-height: 1.1;
            margin: 0;
            text-align: center;
        }

        .univ-address {
            font-size: 8.5px;
            color: #222222;
            text-align: center;
            margin-top: 2px;
        }

        .univ-contact {
            font-size: 8px;
            color: #333333;
            text-align: center;
            margin-top: 1px;
        }

        /* Report Headings */
        .report-headings {
            text-align: center;
            margin: 6px 0 8px 0;
        }

        .report-headings .office-label {
            font-size: 10px;
            font-weight: normal;
            margin: 0;
        }

        .report-headings .dept-name {
            font-size: 10.5px;
            font-weight: normal;
            margin: 1px 0 6px 0;
        }

        .report-headings .report-title {
            font-size: 11.5px;
            font-weight: bold;
            margin: 1px 0;
        }

        .report-headings .report-period {
            font-size: 9.5px;
            font-weight: normal;
            margin: 2px 0;
        }

        .summary-intro {
            text-align: center;
            margin: 6px 0 10px 0;
            font-size: 9.5px;
        }

        .summary-intro .respondent-count {
            font-weight: normal;
            font-size: 9.5px;
            margin-top: 3px;
        }

        /* Data Tables */
        .section-title {
            font-size: 9.5px;
            font-weight: bold;
            margin: 12px 0 4px 0;
            page-break-after: avoid;
        }

        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 7px;
            page-break-inside: auto;
        }

        table.keep-together {
            page-break-inside: avoid;
        }

        table.data-table thead {
            display: table-header-group;
        }

        table.data-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }

        table.data-table th,
        table.data-table td {
            border: 0.75px solid #000000;
            padding: 3px 5px;
            vertical-align: middle;
        }

        table.data-table th {
            background-color: transparent;
            font-weight: bold;
            text-align: center;
            font-size: 8.5px;
        }

        table.data-table th.text-left,
        table.data-table td.text-left {
            text-align: left;
        }

        table.data-table td.text-center {
            text-align: center;
        }

        table.data-table td.text-right {
            text-align: right;
        }

        table.data-table tr.subhead td {
            background-color: transparent;
            font-weight: bold;
        }

        table.data-table tr.total-row td {
            background-color: transparent;
            font-weight: bold;
        }

        .indent {
            padding-left: 18px !important;
        }

        .nowrap {
            white-space: nowrap;
        }

        .stacked-pct {
            display: block;
            font-size: 8px;
            color: #444444;
        }

        /* Legend, Comments & Signatories */
        .rating-scale {
            font-size: 8.5px;
            margin: 4px 0 12px 0;
            line-height: 1.4;
        }

        .note-box {
            border: 1px solid #333333;
            padding: 6px 8px;
            margin-bottom: 10px;
            min-height: 24px;
            page-break-inside: avoid;
        }

        .signatories {
            width: 100%;
            border-collapse: collapse;
            margin-top: 22px;
            page-break-inside: avoid;
        }

        .signatories td {
            border: none;
            width: 50%;
            padding: 14px 10px 4px 0;
            vertical-align: top;
            font-size: 9px;
        }

        .sig-line {
            margin-top: 22px;
            border-top: 1px solid #333333;
            width: 75%;
            padding-top: 2px;
            font-size: 8.5px;
        }
    </style>
</head>
<body>
    </head>
<body class="{{ !empty($watermarkText) ? 'has-watermark' : '' }}">
    @if(!empty($watermarkText))
        <div class="watermark">{{ $watermarkText }}</div>
    @endif

    @hasSection('show_footer')
        <div class="page-footer">
            {{ $docControlCode }}
        </div>
    @endif

    <div class="header-wrapper">
        @if(!empty($logoDataUri))
            <img src="{{ $logoDataUri }}" alt="Central Luzon State University" class="logotype-img">
        @else
            <div class="univ-title">Central Luzon State University</div>
            <div class="univ-address">Science City of Muñoz, 3120 Nueva Ecija, Philippines</div>
            <div class="univ-contact">(6344) 940-8785 &nbsp;|&nbsp; op@clsu.edu.ph &nbsp;|&nbsp; clsu.edu.ph</div>
        @endif
    </div>

    @yield('content')
</body>
</html>