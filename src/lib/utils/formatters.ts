export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return '—';
  try {
    // If it's already HH:mm
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    const date = new Date(timeString);
    if (isNaN(date.getTime())) return timeString;
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return timeString;
  }
}

export function formatDateTime(dateTimeString: string | null | undefined): string {
  if (!dateTimeString) return '—';
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateTimeString;
  }
}

export function formatDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '—';
  try {
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return '—';
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  } catch {
    return '—';
  }
}
