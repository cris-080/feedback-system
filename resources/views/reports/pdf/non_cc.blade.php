@extends('reports.pdf.layout')

@section('title', 'Office Feedback Report')
@section('show_footer', true)

@section('content')
    <div class="report-headings">
        <div class="office-label">COLLEGE/OFFICE/DIVISION</div>
        <div class="dept-name">{{ $department }}</div>
        <div class="report-title">OFFICE FEEDBACK REPORT</div>
        <div class="report-period">{{ $period }}</div>
    </div>

    <div class="summary-intro">
        <div>This is the summary report on the feedback given by:</div>
        <div class="respondent-count">{{ $total_respondents }} (student-raters/evaluators)</div>
    </div>

    {{-- Demographics & Services --}}
    <table class="data-table keep-together">
        <thead>
            <tr>
                <th class="text-left" style="width: 64%;">Type of Services rendered within the evaluation period</th>
                <th style="width: 18%;">Frequency</th>
                <th style="width: 18%;">Percent</th>
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

            <tr class="subhead"><td colspan="3">Region of Residence</td></tr>
            @forelse($regions as $reg)
                <tr>
                    <td class="indent">{{ $reg['name'] }}</td>
                    <td class="text-center">{{ $reg['freq'] }}</td>
                    <td class="text-center nowrap">{{ $reg['pct'] }}</td>
                </tr>
            @empty
                <tr><td class="indent">None</td><td class="text-center">0</td><td class="text-center">0%</td></tr>
            @endforelse

            <tr class="subhead"><td colspan="3">Service Availed</td></tr>
            @forelse($services as $svc)
                <tr>
                    <td class="indent">{{ $svc['name'] }}</td>
                    <td class="text-center">{{ $svc['freq'] }}</td>
                    <td class="text-center nowrap">{{ $svc['pct'] }}</td>
                </tr>
            @empty
                <tr><td class="indent">None</td><td class="text-center">0</td><td class="text-center">0%</td></tr>
            @endforelse
        </tbody>
    </table>

    {{-- SQD Matrix --}}
    @php
        $sqdQuestions = [
            'sqd0' => 'SQD0. I am satisfied with the service that I availed',
            'sqd1' => 'SQD1. I spent a reasonable amount of time for my transaction.',
            'sqd2' => 'SQD2. The office followed the transaction’s requirement from the office or its website.',
            'sqd3' => 'SQD3. The steps (including payment) I needed to do for my transaction were easy and simple',
            'sqd4' => 'SQD4. I easily found information about my transaction from the office or its website.',
            'sqd5' => 'SQD5. I paid a reasonable amount of fees for my transaction.',
            'sqd6' => 'SQD6. I feel the office was fair to everyone, or “walang palakasan” during my transaction.',
            'sqd7' => 'SQD7. I was treated courteously by the staff, and (I asked for help) the staff was helpful',
            'sqd8' => 'SQD8. I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.',
            'overall_satisfaction' => 'Overall, how would you rate your entire educational experience at CLSU?',
        ];
    @endphp

    <table class="data-table keep-together">
        <thead>
            <tr>
                <th rowspan="3" class="text-left" style="width: 44%;">Service Quality Dimensions (SQD)</th>
                <th colspan="6">Frequency Ratings</th>
                <th rowspan="3" style="width: 8%;">MEAN</th>
                <th rowspan="3" style="width: 14%;">ADJECTIVAL RATING</th>
            </tr>
            <tr>
                <th style="width: 5.5%;">SD</th>
                <th style="width: 5.5%;">D</th>
                <th style="width: 5.5%;">N</th>
                <th style="width: 5.5%;">A</th>
                <th style="width: 5.5%;">SA</th>
                <th style="width: 6.5%;">N/A</th>
            </tr>
            <tr>
                <th>1</th>
                <th>2</th>
                <th>3</th>
                <th>4</th>
                <th>5</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            @foreach($sqdQuestions as $key => $question)
                @php $row = $sqd[$key] ?? []; @endphp
                <tr>
                    <td>{{ $question }}</td>
                    <td class="text-center">{{ $row['1'] ?? 0 }}</td>
                    <td class="text-center">{{ $row['2'] ?? 0 }}</td>
                    <td class="text-center">{{ $row['3'] ?? 0 }}</td>
                    <td class="text-center">{{ $row['4'] ?? 0 }}</td>
                    <td class="text-center">{{ $row['5'] ?? 0 }}</td>
                    <td class="text-center">{{ $row['na'] ?? 0 }}</td>
                    <td class="text-center nowrap" style="font-weight: bold;">{{ $row['mean'] ?? '' }}</td>
                    <td class="text-center">{{ $row['adj'] ?? '' }}</td>
                </tr>
            @endforeach
            <tr class="total-row">
                <td colspan="7" class="text-right">Mean Rating</td>
                <td class="text-center nowrap">{{ $final_mean }}</td>
                <td class="text-center">{{ $final_adj }}</td>
            </tr>
        </tbody>
    </table>

    <div class="rating-scale">
        <strong>Rating Scale:</strong><br>
        4.21 - 5.00 &nbsp;- Excellent<br>
        3.41 - 4.20 &nbsp;- Very Good<br>
        2.61 - 3.40 &nbsp;- Good<br>
        1.81 - 2.60 &nbsp;- Fair<br>
        1.00 - 1.80 &nbsp;- Needs Improvement
    </div>

    {{-- Harassment --}}
    <table class="data-table keep-together">
        <thead>
            <tr>
                <th class="text-left" style="width: 64%;">Have you experienced any form of harassment during the transactions in this office?</th>
                <th style="width: 18%;">Frequency</th>
                <th style="width: 18%;">Percent</th>
            </tr>
        </thead>
        <tbody>
            <tr><td class="indent">Yes</td><td class="text-center">{{ $har_y }}</td><td class="text-center nowrap">{{ $har_y_p }}</td></tr>
            <tr><td class="indent">No</td><td class="text-center">{{ $har_n }}</td><td class="text-center nowrap">{{ $har_n_p }}</td></tr>
            <tr><td colspan="3"><strong>If YES, please specify:</strong> {{ $harassment_details }}</td></tr>
        </tbody>
    </table>

    {{-- Recommendation --}}
    <table class="data-table keep-together">
        <thead>
            <tr>
                <th class="text-left" style="width: 64%;">Overall, I would recommend CLSU to my peers</th>
                <th style="width: 18%;">Frequency</th>
                <th style="width: 18%;">Percent</th>
            </tr>
        </thead>
        <tbody>
            <tr><td class="indent">Yes</td><td class="text-center">{{ $rec_y }}</td><td class="text-center nowrap">{{ $rec_y_p }}</td></tr>
            <tr><td class="indent">No</td><td class="text-center">{{ $rec_n }}</td><td class="text-center nowrap">{{ $rec_n_p }}</td></tr>
        </tbody>
    </table>

    {{-- Comments --}}
    <div class="section-title">Rater’s comments/ Suggestions</div>
    <div class="note-box">{{ $comments }}</div>

    {{-- Signatories --}}
    <table class="signatories">
        <tr>
            <td>
                Prepared by:
                <div class="sig-line">(Unit Head)</div>
            </td>
            <td>
                Attested:
                <div class="sig-line">Program (VP)</div>
            </td>
        </tr>
        <tr>
            <td>
                Reviewed by:
                <div class="sig-line">(Dean/Director)</div>
            </td>
            <td>
                &nbsp;
                <div class="sig-line">(President)</div>
            </td>
        </tr>
    </table>
@endsection