import type { CheckIn } from '@/lib/checkin';

export type CheckInAlert = {
  id: string;
  title: string;
  message: string;
  tone: 'warning' | 'danger' | 'info';
};

export function getCheckInAlerts(currentCheckIn: CheckIn, checkIns: CheckIn[]) {
  const alerts: CheckInAlert[] = [];
  const recentCheckIns = [currentCheckIn, ...checkIns.filter((item) => item.id !== currentCheckIn.id)];

  if (currentCheckIn.fingerPain >= 4) {
    alerts.push({
      id: 'finger-pain',
      title: 'Ojo con los dedos',
      message:
        'Considera reducir volumen de dedos y evitar ejercicios intensos de agarre. Si el dolor persiste, consulta a un fisio.',
      tone: 'danger'
    });
  }

  const lastTwoHighRpe = recentCheckIns.slice(0, 2).every((checkIn) => checkIn.rpe >= 9);

  if (recentCheckIns.length >= 2 && lastTwoHighRpe) {
    alerts.push({
      id: 'fatigue',
      title: 'Posible acumulación de fatiga',
      message:
        'Van dos sesiones muy demandantes seguidas. La próxima sesión conviene bajarla o tomar una descarga temprana.',
      tone: 'warning'
    });
  }

  if (currentCheckIn.energy <= 2) {
    alerts.push({
      id: 'low-energy',
      title: 'Recuperación primero',
      message:
        'Energía baja hoy. Revisa sueño, comida e hidratación; la recuperación también es parte del entrenamiento.',
      tone: 'info'
    });
  }

  return alerts;
}
