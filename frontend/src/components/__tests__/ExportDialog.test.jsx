import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect } from 'vitest'
// jest-dom extends expect; ensure global is available
global.expect = expect
import ExportDialog from '../features/ExportDialog'
import exportService from '@/api/services/exportService'

// mock exportService methods
vi.mock('@/api/services/exportService', () => {
  return {
    default: {
      startRun: vi.fn(),
      startRunForm: vi.fn(),
      confirmMetrics: vi.fn(),
    },
  }
})

// simple mocks for UI components to avoid undefined imports during tests
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }) => <div>{children}</div>,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <div>{children}</div>,
  DialogFooter: ({ children }) => <div>{children}</div>
}));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  TabsContent: ({ children }) => <div>{children}</div>
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props) => <input {...props} />
}));
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }) => <label {...props}>{children}</label>
}));
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, ...props }) => <input type="checkbox" checked={checked} {...props} />
}));
vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }) => <div>{children}</div>,
  AlertDescription: ({ children }) => <div>{children}</div>
}));

describe('ExportDialog component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('opens, configures universal endpoint and shows preview + metrics', async () => {
    const fakeResp = {
      runId: 'run123',
      preview: [{ a: 1 }, { a: 2 }],
      availableMetrics: ['m1', 'm2'],
    }
    exportService.startRun.mockResolvedValue(fakeResp)
    exportService.confirmMetrics.mockResolvedValue({ ok: true })

    const handleFinished = vi.fn()
    render(<ExportDialog open={true} onOpenChange={() => {}} onFinished={handleFinished} />)

    // fill baseUrl and path
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/api.foo.com/i), {
      target: { value: 'https://api.foo.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/\/v1\/members/i), {
      target: { value: '/v1/members' },
    })
    fireEvent.click(screen.getByText(/Extraer/i))

    await waitFor(() => expect(exportService.startRun).toHaveBeenCalled())

    // preview appears
    expect(screen.getByText(/Vista previa/i)).toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()

    // step 2 metrics
    expect(screen.getByText('m1')).toBeInTheDocument()
    fireEvent.click(screen.getByText('m1'))
    fireEvent.click(screen.getByText(/Confirmar métricas/i))

    await waitFor(() => expect(exportService.confirmMetrics).toHaveBeenCalledWith('run123', ['m1'], {}))
    expect(handleFinished).toHaveBeenCalled()
  })

  test('confirmMetrics can accept full object payload with views', async () => {
    exportService.startRun.mockResolvedValue({ runId: 'run456', preview: [], availableMetrics: ['m1'] });
    exportService.confirmMetrics.mockResolvedValue({ ok: true });
    const handleFinished2 = vi.fn();
    render(<ExportDialog open={true} onOpenChange={() => {}} onFinished={handleFinished2} />);

    fireEvent.change(screen.getByPlaceholderText(/https:\/\/api.foo.com/i), {
      target: { value: 'https://api.foo.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/\/v1\/members/i), {
      target: { value: '/v1/members' }
    });
    fireEvent.click(screen.getByText(/Extraer/i));

    await waitFor(() => expect(exportService.startRun).toHaveBeenCalled());
    fireEvent.click(screen.getByText('m1'));
    fireEvent.click(screen.getByText(/Confirmar métricas/i));

    await waitFor(() => expect(exportService.confirmMetrics).toHaveBeenCalledWith(
      'run456',
      ['m1'],
      {} // in UI we don't provide views yet; should default to empty
    ));
    expect(handleFinished2).toHaveBeenCalled();
  });

  test('excel file triggers mapping step with detected columns', async () => {
    const fakeResp = {
      runId: 'runX',
      preview: [{ Nombre: 'A', Correo: 'a@x' }],
      availableMetrics: ['clients'],
      detectedColumns: ['Nombre','Correo'],
      suggestedMappings: { clients: { name: 'Nombre', email: 'Correo' } }
    };
    exportService.startRun.mockResolvedValue(fakeResp);
    exportService.confirmMetrics.mockResolvedValue({ ok: true });
    const handleFinished3 = vi.fn();

    render(<ExportDialog open={true} onOpenChange={() => {}} onFinished={handleFinished3} />);

    // switch to file tab and select fake file
    fireEvent.click(screen.getByText(/Importar Archivo/i));
    const fileInput = screen.getByLabelText(/Seleccionar archivo/i);
    const file = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByText(/Importar/i));
    await waitFor(() => expect(exportService.startRun).toHaveBeenCalled());

    // preview shown
    expect(screen.getByText(/Vista previa/i)).toBeInTheDocument();

    // move to mapping
    // mapping title should appear
    await waitFor(() => expect(screen.getByText(/Mapeo de columnas/i)).toBeInTheDocument());
    // column dropdowns should render
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();

    // choose metric and confirm
    fireEvent.click(screen.getByText('clients'));
    fireEvent.click(screen.getByText(/Confirmar métricas/i));

    await waitFor(() => expect(exportService.confirmMetrics).toHaveBeenCalled());
    expect(handleFinished3).toHaveBeenCalled();
  });

  test('startRun returning object preview renders tabs for each endpoint', async () => {
    const fakeResp = {
      runId: 'multi1',
      preview: {
        clients: [{ name: 'Alice' }],
        sales: [{ amount: 99 }]
      },
      availableMetrics: ['clients','sales'],
      metricsByEndpoint: { clients: ['clients'], sales: ['sales'] }
    };
    exportService.startRun.mockResolvedValue(fakeResp);
    exportService.confirmMetrics.mockResolvedValue({ ok: true });
    const handleFinished4 = vi.fn();

    render(<ExportDialog open={true} onOpenChange={() => {}} onFinished={handleFinished4} />);

    fireEvent.change(screen.getByPlaceholderText(/https:\/\/api.foo.com/i), {
      target: { value: 'https://api.foo.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/\/v1\/members/i), {
      target: { value: '/v1/members' }
    });
    fireEvent.click(screen.getByText(/Extraer/i));

    await waitFor(() => expect(exportService.startRun).toHaveBeenCalled());

    // both endpoint keys should render as triggers
    expect(screen.getByText('clients')).toBeInTheDocument();
    expect(screen.getByText('sales')).toBeInTheDocument();

    // ensure both previews are visible (tabs content always rendered in our simple mock)
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });
})
