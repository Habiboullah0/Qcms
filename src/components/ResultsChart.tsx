'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

// Register Chart.js components
Chart.register(...registerables)

interface ResultsChartProps {
  correct: number
  incorrect: number
  skipped: number
}

export default function ResultsChart({ correct, incorrect, skipped }: ResultsChartProps) {
  const chartRef = useRef<Chart | null>(null)
  
  const data = {
    labels: ['Correctes', 'Incorrectes', 'Sans réponse'],
    datasets: [
      {
        data: [correct, incorrect, skipped],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // success
          'rgba(239, 68, 68, 0.8)',  // error
          'rgba(245, 158, 11, 0.8)'  // warning
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)'
        ],
        borderWidth: 1,
        hoverOffset: 4
      }
    ]
  }
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            family: 'Poppins, sans-serif',
            size: 14
          },
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          family: 'Poppins, sans-serif',
          size: 14
        },
        bodyFont: {
          family: 'Poppins, sans-serif',
          size: 14
        },
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1000
    },
    cutout: '60%'
  }
  
  return (
    <div className="h-full w-full">
      <Doughnut data={data} options={options} />
    </div>
  )
}
