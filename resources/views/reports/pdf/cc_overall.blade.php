@extends('reports.pdf.layout')

@section('title', "University Feedback Summary (Citizen's Charter)")
@section('show_footer', true)

@section('content')
    <div class="report-headings">
        <div class="office-label">OFFICE OF THE UNIVERSITY PRESIDENT</div>
        <div class="dept-name">University Feedback Summary</div>
        <div class="report-title">CITIZEN’S CHARTER FEEDBACK REPORT</div>
        <div class="report-period">{{ $period }}</div>
    </div>

    <div class="summary-intro">
        <div>This is the summary report on the feedback given by:</div>
        <div class="respondent-count">{{ $total_respondents }} student-raters/evaluators</div>
    </div>

    {{-- Table 1 --}}
    <div class="section-title">Table 1: Harmonized Client Satisfaction Measurement Overall Scores</div>
    <table class="data-table">
        <thead>
            <tr>
                <th class="text-left" style="width: 70%;">Indicators</th>
                <th style="width: 30%;">Score</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>CC Awareness</td><td class="text-center nowrap">{{ $cc_awareness_pct }}</td></tr>
            <tr><td>CC Visibility</td><td class="text-center nowrap">{{ $cc_visibility_pct }}</td></tr>
            <tr><td>CC Helpfulness</td><td class="text-center nowrap">{{ $cc_helpfulness_pct }}</td></tr>
            <tr><td>Response Rate</td><td class="text-center nowrap">{{ $response_rate_pct }}</td></tr>
            <tr class="total-row"><td>Overall Score</td><td class="text-center nowrap">{{ $overall_score_pct }}</td></tr>
        </tbody>
    </table>

    {{-- Table 2 --}}
    <div class="section-title">Table 2. A detailed report per category and the summary report on the services that CLSU surveyed</div>
    <table class="data-table">
        <thead>
            <tr>
                <th class="text-left" style="width: 60%;">Frontline Services</th>
                <th style="width: 20%;">Responses</th>
                <th style="width: 20%;">Total Transactions</th>
            </tr>
        </thead>
        <tbody>
            <tr class="subhead">
                <td>External Services Total</td>
                <td class="text-center">{{ $ext_total_responses }}</td>
                <td class="text-center">{{ $ext_total_transactions }}</td>
            </tr>
            @forelse($ext_services as $svc)
                <tr>
                    <td class="indent">{{ $svc['name'] }}</td>
                    <td class="text-center">{{ $svc['responses'] }}</td>
                    <td class="text-center">{{ $svc['transactions'] }}</td>
                </tr>
            @empty
                <tr>
                    <td class="indent">None</td>
                    <td class="text-center">0</td>
                    <td class="text-center">0</td>
                </tr>
            @endforelse

            <tr class="subhead">
                <td>Internal Services Total</td>
                <td class="text-center">{{ $int_total_responses }}</td>
                <td class="text-center">{{ $int_total_transactions }}</td>
            </tr>
            @forelse($int_services as $svc)
                <tr>
                    <td class="indent">{{ $svc['name'] }}</td>
                    <td class="text-center">{{ $svc['responses'] }}</td>
                    <td class="text-center">{{ $svc['transactions'] }}</td>
                </tr>
            @empty
                <tr>
                    <td class="indent">None</td>
                    <td class="text-center">0</td>
                    <td class="text-center">0</td>
                </tr>
            @endforelse

            <tr class="total-row">
                <td>OVERALL TOTAL</td>
                <td class="text-center">{{ $total_responses }}</td>
                <td class="text-center">{{ $total_transactions }}</td>
            </tr>
        </tbody>
    </table>

    {{-- Table 3 --}}
    <div class="section-title">Table 3. Services which had no clients</div>
    <table class="data-table">
        <thead>
            <tr>
                <th class="text-left">Frontline Services</th>
            </tr>
        </thead>
        <tbody>
            @forelse($zero_services as $svcName)
                <tr><td>{{ $svcName }}</td></tr>
            @empty
                <tr><td>None</td></tr>
            @endforelse
        </tbody>
    </table>

    {{-- Table 4 --}}
    <div class="section-title">Table 4. Socio-Demographic profile of clients surveyed in terms of client type, sex, and region of residence</div>
    <table class="data-table">
        <thead>
            <tr>
                <th class="text-left" style="width: 64%;"></th>
                <th style="width: 18%;">Frequency</th>
                <th style="width: 18%;">Percentage</th>
            </tr>
        </thead>
        <tbody>
            <tr class="subhead"><td colspan="3">Client Type</td></tr>
            <tr><td class="indent">Citizen</td><td class="text-center">{{ $ct_cit }}</td><td class="text-center nowrap">{{ $ct_cit_p }}</td></tr>
            <tr><td class="indent">Business</td><td class="text-center">{{ $ct_bus }}</td><td class="text-center nowrap">{{ $ct_bus_p }}</td></tr>
            <tr><td class="indent">Government</td><td class="text-center">{{ $ct_gov }}</td><td class="text-center nowrap">{{ $ct_gov_p }}</td></tr>

            <tr class="subhead"><td colspan="3">Sex</td></tr>
            <tr><td class="indent">Male</td><td class="text-center">{{ $sex_m }}</td><td class="text-center nowrap">{{ $sex_m_p }}</td></tr>
            <tr><td class="indent">Female</td><td class="text-center">{{ $sex_f }}</td><td class="text-center nowrap">{{ $sex_f_p }}</td></tr>
            <tr><td class="indent">Prefer not to say</td><td class="text-center">{{ $sex_na }}</td><td class="text-center nowrap">{{ $sex_na_p }}</td></tr>

            <tr class="subhead"><td colspan="3">Region of Residence</td></tr>
            @forelse($regions as $reg)
                <tr>
                    <td class="indent">{{ $reg['name'] }}</td>
                    <td class="text-center">{{ $reg['freq'] }}</td>
                    <td class="text-center nowrap">{{ $reg['pct'] }}</td>
                </tr>
            @empty
                <tr>
                    <td class="indent">N/A</td>
                    <td class="text-center">0</td>
                    <td class="text-center">0%</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    {{-- Table 5 --}}
    <div class="section-title">Table 5. Count of CC and SQD results</div>
    <table class="data-table">
        <thead>
            <tr>
                <th colspan="3">Citizen’s Charter (CC)</th>
            </tr>
            <tr>
                <th class="text-left" style="width: 68%;">CC1: Which of the following describes your awareness of the CC?</th>
                <th style="width: 16%;">Responses</th>
                <th style="width: 16%;">Percentage</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>I know what a CC is and I saw this office’s CC.</td><td class="text-center">{{ $cc['cc1_1']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc1_1']['p'] ?? '' }}</td></tr>
            <tr><td>I know what a CC is but I did NOT see this office’s CC.</td><td class="text-center">{{ $cc['cc1_2']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc1_2']['p'] ?? '' }}</td></tr>
            <tr><td>I learned of the CC only when I saw this office’s CC.</td><td class="text-center">{{ $cc['cc1_3']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc1_3']['p'] ?? '' }}</td></tr>
            <tr><td>I do not know what a CC is and I did NOT see one in this office’s CC.</td><td class="text-center">{{ $cc['cc1_4']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc1_4']['p'] ?? '' }}</td></tr>

            <tr class="subhead"><td colspan="3">CC2: If aware of CC, would you say that the CC of this office was…?</td></tr>
            <tr><td>Easy to see</td><td class="text-center">{{ $cc['cc2_1']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc2_1']['p'] ?? '' }}</td></tr>
            <tr><td>Somewhat easy to see</td><td class="text-center">{{ $cc['cc2_2']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc2_2']['p'] ?? '' }}</td></tr>
            <tr><td>Difficult to see</td><td class="text-center">{{ $cc['cc2_3']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc2_3']['p'] ?? '' }}</td></tr>
            <tr><td>Not visible at all</td><td class="text-center">{{ $cc['cc2_4']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc2_4']['p'] ?? '' }}</td></tr>
            <tr><td>N/A</td><td class="text-center">{{ $cc['cc2_5']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc2_5']['p'] ?? '' }}</td></tr>

            <tr class="subhead"><td colspan="3">CC3: If aware of CC, how much did the CC help you in your transactions?</td></tr>
            <tr><td>Helped very much</td><td class="text-center">{{ $cc['cc3_1']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc3_1']['p'] ?? '' }}</td></tr>
            <tr><td>Somewhat helped</td><td class="text-center">{{ $cc['cc3_2']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc3_2']['p'] ?? '' }}</td></tr>
            <tr><td>Did not help</td><td class="text-center">{{ $cc['cc3_3']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc3_3']['p'] ?? '' }}</td></tr>
            <tr><td>N/A</td><td class="text-center">{{ $cc['cc3_4']['c'] ?? '' }}</td><td class="text-center nowrap">{{ $cc['cc3_4']['p'] ?? '' }}</td></tr>
        </tbody>
    </table>

    {{-- Tables 6, 7, 8: Overall / Internal / External SQD0 --}}
    @php
        $summaryTables = [
            ['title' => 'Table 6. Overall Satisfaction Rating', 'scope' => 'overall'],
            ['title' => 'Table 7. Satisfaction Rating for Internal Services', 'scope' => 'internal'],
            ['title' => 'Table 8. Satisfaction Rating for External Services', 'scope' => 'external'],
        ];
    @endphp

    @foreach($summaryTables as $tbl)
        @php $sat = $scopedSqd[$tbl['scope']]['overall_satisfaction'] ?? []; @endphp
        <div class="section-title">{{ $tbl['title'] }}</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 24%;">Service Quality Dimensions (SQD)</th>
                    <th colspan="8">Frequency Ratings</th>
                </tr>
                <tr>
                    <th>Strongly Agree</th>
                    <th>Agree</th>
                    <th>Neutral</th>
                    <th>Disagree</th>
                    <th>Strongly Disagree</th>
                    <th>N/A</th>
                    <th>Total Responses</th>
                    <th>Overall</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="font-weight: bold;">SQD0</td>
                    <td class="text-center">{{ $sat['5'] ?? 0 }}</td>
                    <td class="text-center">{{ $sat['4'] ?? 0 }}</td>
                    <td class="text-center">{{ $sat['3'] ?? 0 }}</td>
                    <td class="text-center">{{ $sat['2'] ?? 0 }}</td>
                    <td class="text-center">{{ $sat['1'] ?? 0 }}</td>
                    <td class="text-center">{{ $sat['na'] ?? 0 }}</td>
                    <td class="text-center">{{ $sat['total'] ?? 0 }}</td>
                    <td class="text-center nowrap">{{ $sat['p'] ?? '0%' }}</td>
                </tr>
            </tbody>
        </table>
    @endforeach

    {{-- Tables 9, 10, 11: Overall / Internal / External SQD Breakdown --}}
    @php
        $detailTables = [
            ['title' => 'Table 9. Overall satisfaction rating per Service Quality Dimension', 'scope' => 'overall'],
            ['title' => 'Table 10. Internal Services satisfaction rating per Service Quality Dimension', 'scope' => 'internal'],
            ['title' => 'Table 11. External Services satisfaction rating per Service Quality Dimension', 'scope' => 'external'],
        ];
        $ccDimensions = [
            'sqd0' => 'Responsiveness',
            'sqd1' => 'Reliability',
            'sqd2' => 'Access and Facilities',
            'sqd3' => 'Communication',
            'sqd5' => 'Costs',
            'sqd6' => 'Integrity',
            'sqd7' => 'Assurance',
            'sqd8' => 'Outcome',
        ];
    @endphp

    @foreach($detailTables as $tbl)
        @php
            $items = $scopedSqd[$tbl['scope']]['items'] ?? [];
            $totals = $scopedSqd[$tbl['scope']]['totals'] ?? [];
        @endphp
        <div class="section-title">{{ $tbl['title'] }}</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 24%;">Service Quality Dimensions (SQD)</th>
                    <th colspan="8">Frequency Ratings</th>
                </tr>
                <tr>
                    <th>Strongly Agree</th>
                    <th>Agree</th>
                    <th>Neutral</th>
                    <th>Disagree</th>
                    <th>Strongly Disagree</th>
                    <th>N/A</th>
                    <th>Total Responses</th>
                    <th>Overall</th>
                </tr>
            </thead>
            <tbody>
                @foreach($ccDimensions as $key => $label)
                    @php $r = $items[$key] ?? []; @endphp
                    <tr>
                        <td>{{ $label }}</td>
                        <td class="text-center">{{ $r['5'] ?? 0 }}</td>
                        <td class="text-center">{{ $r['4'] ?? 0 }}</td>
                        <td class="text-center">{{ $r['3'] ?? 0 }}</td>
                        <td class="text-center">{{ $r['2'] ?? 0 }}</td>
                        <td class="text-center">{{ $r['1'] ?? 0 }}</td>
                        <td class="text-center">{{ $r['na'] ?? 0 }}</td>
                        <td class="text-center">{{ $r['total'] ?? 0 }}</td>
                        <td class="text-center nowrap">{{ $r['p'] ?? '0%' }}</td>
                    </tr>
                @endforeach
                <tr class="total-row">
                    <td>Overall</td>
                    <td class="text-center">{{ $totals['5'] ?? 0 }}</td>
                    <td class="text-center">{{ $totals['4'] ?? 0 }}</td>
                    <td class="text-center">{{ $totals['3'] ?? 0 }}</td>
                    <td class="text-center">{{ $totals['2'] ?? 0 }}</td>
                    <td class="text-center">{{ $totals['1'] ?? 0 }}</td>
                    <td class="text-center">{{ $totals['na'] ?? 0 }}</td>
                    <td class="text-center">{{ $totals['total'] ?? 0 }}</td>
                    <td class="text-center nowrap">{{ $totals['p'] ?? '0%' }}</td>
                </tr>
            </tbody>
        </table>
    @endforeach
@endsection