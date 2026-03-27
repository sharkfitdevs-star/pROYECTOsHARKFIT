
import React, { useState, useEffect, useCallback } from 'react';
import { WidgetGrid } from './widgets';
import DashboardWidgetsService from '../../api/services/DashboardWidgetsService';
import './DashboardOverview.css';
import ChartBuilder from './ChartBuilder';
import SemaforosOverview from './SemaforosOverview';

const DashboardOverview = ({ user }) => {
	const [config, setConfig] = useState(null);
	const [widgetsDisponibles, setWidgetsDisponibles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showConfigurador, setShowConfigurador] = useState(false);
	const [showChartBuilder, setShowChartBuilder] = useState(false);

	const cargarConfig = useCallback(async () => {
		try {
			setLoading(true);
			const response = await DashboardWidgetsService.getMiConfig();
			setConfig(response.data);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, []);

	const cargarWidgetsDisponibles = useCallback(async () => {
		try {
			const response = await DashboardWidgetsService.getWidgetsDisponibles();
			setWidgetsDisponibles(response.data || []);
		} catch (err) {
			console.error(err);
		}
	}, []);

	useEffect(() => {
		cargarConfig();
		cargarWidgetsDisponibles();
	}, [cargarConfig, cargarWidgetsDisponibles]);

	const handleAgregarWidget = async (widgetId) => {
		try {
			const response = await DashboardWidgetsService.agregarWidget(widgetId);
			setConfig(response.data);
		} catch (err) {
			console.error(err);
		}
				<SemaforosOverview />
	};

	const handleResetear = async () => {
		if (!window.confirm('¿Resetear dashboard?')) return;
		try {
			const response = await DashboardWidgetsService.resetearDashboard();
			setConfig(response.data);
		} catch (err) {
			console.error(err);
		}
	};

	const handleSeedWidgets = async () => {
		try {
			await DashboardWidgetsService.seedWidgets();
			await cargarConfig();
		} catch (err) {
			console.error(err);
		}
	};

	const widgetsNoAgregados = widgetsDisponibles.filter(w => {
		if (!config?.widgets) return true;
		return !config.widgets.some(cw => cw.widget?._id === w._id || cw.widget === w._id);
	});

	if (loading) return <div className="dashboard-overview loading"><p>Cargando...</p></div>;
	if (error) return <div className="dashboard-overview error"><p>{error}</p><button onClick={cargarConfig}>Reintentar</button></div>;

	return (
		<>
			<div className="dashboard-overview">
				<div className="overview-header">
					<div className="header-info">
						<h1>Dashboard</h1>
						<p>Bienvenido, {user?.name || user?.username || 'Usuario'} <span>({user?.role || 'staff'})</span></p>
					</div>
					<div className="header-actions">
						<button className="btn-configurar" onClick={() => setShowConfigurador(!showConfigurador)}>
							<i className="bi bi-gear"></i> {showConfigurador ? 'Cerrar' : 'Personalizar'}
						</button>
					<button style={{ marginLeft: 8 }} onClick={() => setShowChartBuilder(true)}>
						＋ Agregar widget
					</button>
					<button className="btn-refresh" onClick={cargarConfig}>
						<i className="bi bi-arrow-clockwise"></i>
					</button>
					</div>
				</div>

				{showConfigurador && (
					<div className="configurador-panel">
						<div className="configurador-header">
							<h3>Personaliza tu Dashboard</h3>
							<button onClick={handleResetear}>Resetear</button>
						</div>
						<div className="widgets-disponibles">
							<h4>Widgets disponibles:</h4>
							{widgetsNoAgregados.length === 0 ? (
								<p>Ya tienes todos los widgets</p>
							) : (
								<div className="widgets-lista">
									{widgetsNoAgregados.map(widget => (
										<div key={widget._id} className="widget-item-disponible" onClick={() => handleAgregarWidget(widget._id)}>
											<span>{widget.nombre}</span>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}

				<div className="overview-content">
					{config?.widgets?.length > 0 ? (
						<WidgetGrid config={config} onConfigChange={setConfig} />
					) : (
						<div className="no-widgets-message">
							<h3>Tu dashboard está vacío</h3>
							<button onClick={handleSeedWidgets}>Crear widgets automáticamente</button>
						</div>
					)}
				</div>
			</div>

			{showChartBuilder && (
				<ChartBuilder
					isOpen={showChartBuilder}
					onClose={() => setShowChartBuilder(false)}
					onSave={() => { setShowChartBuilder(false); cargarConfig(); }}
				/>
			)}
		</>
	);
};

export default DashboardOverview;

