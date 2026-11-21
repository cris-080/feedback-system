@extends('reports.pdf.layout')

@section('title', 'University Feedback Summary (Non-CC)')
@section('show_footer', true)

@section('content')
    <div class="report-headings">
        <div class="office-label">OFFICE OF THE UNIVERSITY PRESIDENT</div>
        <div class="dept-name">University Feedback Summary</div>
        <div class="report-title">OFFICE FEEDBACK REPORT</div>
        <div class="report-period">{{ $period }}</div>
    </div>

    <div class="summary-intro">
        <div>This is the summary report on the feedback given by:</div>
        <div class="respondent-count">{{ $total_respondents }} student-raters/evaluators</div>
    </div>

    {{-- Demographics --}}
    <table class="data-table">
        <thead>
            <tr>
                <th class="text-left" style="width: 64%;">Type of Services rendered within the evaluation period</th>
                <th style="width: 18%;">Frequency</th>
                <th style="width: 18%;">Percent</th>
            </tr>
        </thead>
        <tbody>
            <tr class="subhead">
                <td colspan="3">Sex</td>
            </tr>
            <tr>
                <td class="indent">Male</td>
                <td class="text-center">{{ $sex_m }}</td>
                <td class="text-center nowrap">{{ $sex_m_p }}</td>
            </tr>
            <tr>
                <td class="indent">Female</td>
                <td class="text-center">{{ $sex_f }}</td>
                <td class="text-center nowrap">{{ $sex_f_p }}</td>
            </tr>
        </tbody>
    </table>

    {{-- SQD Matrix --}}
    @php
        $dimensions = [
            'sqd0' => 'RESPONSIVENESS',
            'sqd1' => 'RELIABILITY',
            'sqd2' => 'ACCESS AND FACILITIES',
            'sqd3' => 'COMMUNICATION (Offline)',
            'sqd4' => 'COMMUNICATION (Online)',
            'sqd5' => 'COSTS',
            'sqd6' => 'INTEGRITY',
            'sqd7' => 'ASSURANCE',
            'sqd8' => 'OUTCOME',
        ];
    @endphp

    <table class="data-table">
        <thead>
            <tr>
                <th class="text-left" style="width: 24%;">Service Quality Dimension</th>
                <th style="width: 10%;">Strongly Disagree</th>
                <th style="width: 10%;">Disagree</th>
                <th style="width: 10%;">Neutral</th>
                <th style="width: 10%;">Agree</th>
                <th style="width: 10%;">Strongly Agree</th>
                <th style="width: 10%;">MEAN</th>
                <th style="width: 16%;">ADJECTIVAL RATING*</th>
            </tr>
        </thead>
        <tbody>
            @foreach($dimensions as $key => $label)
                @php $row = $sqd[$key] ?? []; @endphp
                <tr>
                    <td class="text-left" style="font-weight: bold;">{{ $label }}</td>
                    <td class="text-center nowrap">{{ $row['1'] ?? 0 }}<span class="stacked-pct">{{ $row['1_p'] ?? '0%' }}</span></td>
                    <td class="text-center nowrap">{{ $row['2'] ?? 0 }}<span class="stacked-pct">{{ $row['2_p'] ?? '0%' }}</span></td>
                    <td class="text-center nowrap">{{ $row['3'] ?? 0 }}<span class="stacked-pct">{{ $row['3_p'] ?? '0%' }}</span></td>
                    <td class="text-center nowrap">{{ $row['4'] ?? 0 }}<span class="stacked-pct">{{ $row['4_p'] ?? '0%' }}</span></td>
                    <td class="text-center nowrap">{{ $row['5'] ?? 0 }}<span class="stacked-pct">{{ $row['5_p'] ?? '0%' }}</span></td>
                    <td class="text-center nowrap" style="font-weight: bold;">{{ $row['mean'] ?? '' }}</td>
                    <td class="text-center">{{ $row['adj'] ?? '' }}</td>
                </tr>
            @endforeach
            <tr class="total-row">
                <td colspan="6" class="text-right">Mean Rating</td>
                <td class="text-center nowrap">{{ $final_mean }}</td>
                <td class="text-center">{{ $final_adj }}</td>
            </tr>
        </tbody>
    </table>

    {{-- Overall Educational Experience --}}
    @php $overallSat = $sqd['overall_satisfaction'] ?? []; @endphp
    <table class="data-table keep-together">
        <thead>
            <tr>
                <th style="width: 28%;"></th>
                <th style="width: 9%;">1</th>
                <th style="width: 9%;">2</th>
                <th style="width: 9%;">3</th>
                <th style="width: 9%;">4</th>
                <th style="width: 9%;">5</th>
                <th style="width: 10%;">MEAN</th>
                <th style="width: 17%;">ADJECTIVAL RATING</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="text-left">
                    Overall, how would you rate your entire educational experience at CLSU? (1 as the lowest and 5 as the highest)
                </td>
                <td class="text-center nowrap">{{ $overallSat['1'] ?? 0 }}<span class="stacked-pct">{{ $overallSat['1_p'] ?? '0%' }}</span></td>
                <td class="text-center nowrap">{{ $overallSat['2'] ?? 0 }}<span class="stacked-pct">{{ $overallSat['2_p'] ?? '0%' }}</span></td>
                <td class="text-center nowrap">{{ $overallSat['3'] ?? 0 }}<span class="stacked-pct">{{ $overallSat['3_p'] ?? '0%' }}</span></td>
                <td class="text-center nowrap">{{ $overallSat['4'] ?? 0 }}<span class="stacked-pct">{{ $overallSat['4_p'] ?? '0%' }}</span></td>
                <td class="text-center nowrap">{{ $overallSat['5'] ?? 0 }}<span class="stacked-pct">{{ $overallSat['5_p'] ?? '0%' }}</span></td>
                <td class="text-center nowrap" style="font-weight: bold;">{{ $overallSat['mean'] ?? '' }}</td>
                <td class="text-center">{{ $overallSat['adj'] ?? '' }}</td>
            </tr>
        </tbody>
    </table>

    {{-- Institutional Recommendation --}}
    <table class="data-table keep-together">
        <thead>
            <tr>
                <th class="text-left" style="width: 64%;">Overall, I would recommend CLSU to my peers</th>
                <th style="width: 18%;">Frequency</th>
                <th style="width: 18%;">Percent</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="indent">Yes</td>
                <td class="text-center">{{ $rec_y }}</td>
                <td class="text-center nowrap">{{ $rec_y_p }}</td>
            </tr>
            <tr>
                <td class="indent">No</td>
                <td class="text-center">{{ $rec_n }}</td>
                <td class="text-center nowrap">{{ $rec_n_p }}</td>
            </tr>
        </tbody>
    </table>
@endsection