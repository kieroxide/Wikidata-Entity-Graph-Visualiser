// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn repulsion(
    strength: f64,
    x1: f64, y1: f64, sel1: bool, mass1: f64,
    x2: f64, y2: f64, sel2: bool, mass2: f64,
    offset: f64, exponent: f64, distance_cutoff: f64
) -> js_sys::Array {
    
    let dx = x1 - x2;
    let dy = y1 - y2;

    let center_distance_sq = dx * dx + dy * dy;
    
    // Early cutoff for optimisation and avoiding div by 0
    if center_distance_sq >= distance_cutoff * distance_cutoff || center_distance_sq == 0.0 {
        return js_sys::Array::of4(&0.0.into(), &0.0.into(), &0.0.into(), &0.0.into());
    }

    let center_distance = center_distance_sq.sqrt();

    let edge_distance = f64::max(center_distance - offset, 2.0);
    let force = strength / edge_distance.powf(exponent);

    let unit_x = dx / center_distance;
    let unit_y = dy / center_distance;

    let mut force1x = unit_x * (force / mass1);
    let mut force1y = unit_y * (force / mass1);
    let mut force2x = unit_x * (force / mass2);
    let mut force2y = unit_y * (force / mass2);

    if sel1 {
        force1x = 0.0;
        force1y = 0.0;
    }
    if sel2 {
        force2x = 0.0;
        force2y = 0.0;
    }

    js_sys::Array::of4(
        &force1x.into(),
        &force1y.into(),
        &force2x.into(),
        &force2y.into(),
    )
}
