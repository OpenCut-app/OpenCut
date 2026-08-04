//! Exact rational time and frame rate primitives.
//!
//! ## Serialization stability
//!
//! `RationalTime` and `FrameRate` serialize as objects with fixed field names:
//! - `RationalTime`: `{ "n": i64, "d": u64 }`
//! - `FrameRate`: `{ "n": u64, "d": u64 }`
//!
//! Field names and types are additive-only; renames or removals are breaking.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Exact rational time as a reduced fraction.
///
/// Invariant: `d > 0`, `gcd(|n|, d) == 1`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct RationalTime {
    n: i64,
    d: u64,
}

/// Frames per second as an exact positive rational (e.g. 29.97 = 30000/1001).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct FrameRate {
    n: u64,
    d: u64,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum TimeError {
    #[error("denominator must be non-zero")]
    ZeroDenominator,
    #[error("arithmetic overflow")]
    Overflow,
}

impl RationalTime {
    pub fn new(n: i64, d: u64) -> Result<Self, TimeError> {
        if d == 0 {
            return Err(TimeError::ZeroDenominator);
        }
        Ok(Self::from_parts_unchecked(n, d))
    }

    pub fn numer(&self) -> i64 {
        self.n
    }

    pub fn denom(&self) -> u64 {
        self.d
    }

    pub fn is_zero(&self) -> bool {
        self.n == 0
    }

    pub fn add(self, other: Self) -> Result<Self, TimeError> {
        let lcm = lcm_u64(self.d, other.d).ok_or(TimeError::Overflow)?;
        let left = (self.n as i128)
            .checked_mul((lcm / self.d) as i128)
            .ok_or(TimeError::Overflow)?;
        let right = (other.n as i128)
            .checked_mul((lcm / other.d) as i128)
            .ok_or(TimeError::Overflow)?;
        let sum = left.checked_add(right).ok_or(TimeError::Overflow)?;
        Self::from_i128(sum, lcm as u128)
    }

    pub fn sub(self, other: Self) -> Result<Self, TimeError> {
        let lcm = lcm_u64(self.d, other.d).ok_or(TimeError::Overflow)?;
        let left = (self.n as i128)
            .checked_mul((lcm / self.d) as i128)
            .ok_or(TimeError::Overflow)?;
        let right = (other.n as i128)
            .checked_mul((lcm / other.d) as i128)
            .ok_or(TimeError::Overflow)?;
        let diff = left.checked_sub(right).ok_or(TimeError::Overflow)?;
        Self::from_i128(diff, lcm as u128)
    }

    pub fn mul(self, scalar: i64) -> Result<Self, TimeError> {
        if scalar == 0 || self.n == 0 {
            return Ok(Self { n: 0, d: 1 });
        }
        let n = (self.n as i128)
            .checked_mul(scalar as i128)
            .ok_or(TimeError::Overflow)?;
        Self::from_i128(n, self.d as u128)
    }

    pub fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        (self.n as i128 * other.d as i128).cmp(&(other.n as i128 * self.d as i128))
    }

    pub fn ge(&self, other: &Self) -> bool {
        self.cmp(other) != std::cmp::Ordering::Less
    }

    pub fn lt(&self, other: &Self) -> bool {
        self.cmp(other) == std::cmp::Ordering::Less
    }

    fn from_parts_unchecked(n: i64, d: u64) -> Self {
        if n == 0 {
            return Self { n: 0, d: 1 };
        }

        let g = gcd_u64(n.unsigned_abs(), d);
        let n = n / g as i64;
        let d = d / g;

        // Keep sign on the numerator; denominator stays positive.
        if n == 0 {
            Self { n: 0, d: 1 }
        } else {
            Self { n, d }
        }
    }

    fn from_i128(n: i128, d: u128) -> Result<Self, TimeError> {
        if d == 0 {
            return Err(TimeError::ZeroDenominator);
        }
        if n == 0 {
            return Ok(Self { n: 0, d: 1 });
        }

        let g = gcd_u128(n.unsigned_abs(), d);
        let n = n / g as i128;
        let d = (d / g) as u64;

        if n < i64::MIN as i128 || n > i64::MAX as i128 {
            return Err(TimeError::Overflow);
        }
        if d == 0 {
            return Err(TimeError::Overflow);
        }

        Ok(Self::from_parts_unchecked(n as i64, d))
    }
}

impl FrameRate {
    pub fn new(n: u64, d: u64) -> Result<Self, TimeError> {
        if n == 0 || d == 0 {
            return Err(TimeError::ZeroDenominator);
        }
        Ok(Self { n, d })
    }

    pub fn numer(&self) -> u64 {
        self.n
    }

    pub fn denom(&self) -> u64 {
        self.d
    }

    /// Duration of one frame as an exact rational time.
    pub fn period(&self) -> RationalTime {
        RationalTime::from_parts_unchecked(self.d as i64, self.n)
    }

    pub fn frame_index_floor(&self, time: RationalTime) -> Result<i64, TimeError> {
        frame_index_at(time, self.n, self.d, FrameSnap::Floor)
    }

    pub fn frame_index_ceil(&self, time: RationalTime) -> Result<i64, TimeError> {
        frame_index_at(time, self.n, self.d, FrameSnap::Ceil)
    }

    /// Start time of `index` under this frame rate.
    pub fn frame_start(&self, index: i64) -> Result<RationalTime, TimeError> {
        self.period().mul(index)
    }
}

#[cfg(feature = "floats")]
pub mod floats {
    use super::{FrameRate, RationalTime, TimeError};

    impl RationalTime {
        pub fn from_seconds_floor(seconds: f64, max_denominator: u64) -> Result<Self, TimeError> {
            from_seconds(seconds, max_denominator, SecondsSnap::Floor)
        }

        pub fn from_seconds_ceil(seconds: f64, max_denominator: u64) -> Result<Self, TimeError> {
            from_seconds(seconds, max_denominator, SecondsSnap::Ceil)
        }

        pub fn from_seconds_round(seconds: f64, max_denominator: u64) -> Result<Self, TimeError> {
            from_seconds(seconds, max_denominator, SecondsSnap::Round)
        }

        pub fn to_seconds(self) -> f64 {
            self.n as f64 / self.d as f64
        }
    }

    #[allow(dead_code)]
    impl FrameRate {
        pub fn from_fps_float(fps: f64, max_denominator: u64) -> Result<Self, TimeError> {
            let seconds = RationalTime::from_seconds_round(1.0 / fps, max_denominator)?;
            Ok(Self {
                n: seconds.denom(),
                d: seconds.numer().unsigned_abs(),
            })
        }
    }

    enum SecondsSnap {
        Floor,
        Ceil,
        Round,
    }

    fn from_seconds(seconds: f64, max_denominator: u64, snap: SecondsSnap) -> Result<RationalTime, TimeError> {
        if !seconds.is_finite() {
            return Err(TimeError::Overflow);
        }
        if max_denominator == 0 {
            return Err(TimeError::ZeroDenominator);
        }

        let scaled = match snap {
            SecondsSnap::Floor => (seconds * max_denominator as f64).floor(),
            SecondsSnap::Ceil => (seconds * max_denominator as f64).ceil(),
            SecondsSnap::Round => (seconds * max_denominator as f64).round(),
        };

        if !scaled.is_finite() {
            return Err(TimeError::Overflow);
        }

        RationalTime::new(scaled as i64, max_denominator)
    }
}

#[derive(Copy, Clone)]
enum FrameSnap {
    Floor,
    Ceil,
}

fn frame_index_at(time: RationalTime, rate_n: u64, rate_d: u64, snap: FrameSnap) -> Result<i64, TimeError> {
    if time.n == 0 {
        return Ok(0);
    }

    let numerator = (time.n as i128)
        .checked_mul(rate_n as i128)
        .ok_or(TimeError::Overflow)?;
    let denominator = (time.d as i128)
        .checked_mul(rate_d as i128)
        .ok_or(TimeError::Overflow)?;
    if denominator == 0 {
        return Err(TimeError::ZeroDenominator);
    }

    let (mut q, r) = (numerator / denominator, numerator % denominator);

    match snap {
        FrameSnap::Floor => {
            if r != 0 && numerator < 0 {
                q -= 1;
            }
        }
        FrameSnap::Ceil => {
            if r != 0 && numerator > 0 {
                q += 1;
            }
        }
    }

    if q < i64::MIN as i128 || q > i64::MAX as i128 {
        return Err(TimeError::Overflow);
    }
    Ok(q as i64)
}

fn gcd_u64(mut a: u64, mut b: u64) -> u64 {
    while b != 0 {
        a %= b;
        std::mem::swap(&mut a, &mut b);
    }
    a
}

fn gcd_u128(mut a: u128, mut b: u128) -> u128 {
    while b != 0 {
        a %= b;
        std::mem::swap(&mut a, &mut b);
    }
    a
}

fn lcm_u64(a: u64, b: u64) -> Option<u64> {
    let g = gcd_u64(a, b);
    a.checked_div(g)?.checked_mul(b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reduction_is_canonical() {
        let a = RationalTime::new(2, 4).unwrap();
        let b = RationalTime::new(1, 2).unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn negative_numerator_reduces() {
        let a = RationalTime::new(-4, 8).unwrap();
        let b = RationalTime::new(-1, 2).unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn zero_denominator_rejected() {
        assert_eq!(RationalTime::new(1, 0), Err(TimeError::ZeroDenominator));
    }

    #[test]
    fn add_sub_mul_exactness() {
        let a = RationalTime::new(1, 3).unwrap();
        let b = RationalTime::new(1, 6).unwrap();
        assert_eq!(a.add(b).unwrap(), RationalTime::new(1, 2).unwrap());
        assert_eq!(a.sub(b).unwrap(), RationalTime::new(1, 6).unwrap());
        assert_eq!(a.mul(2).unwrap(), RationalTime::new(2, 3).unwrap());
    }

    #[test]
    fn overflow_surfaces() {
        let large = RationalTime::new(i64::MAX, 1).unwrap();
        assert_eq!(large.add(large), Err(TimeError::Overflow));
    }

    #[test]
    fn frame_index_floor_matches_media_semantics() {
        let fps = FrameRate::new(30, 1).unwrap();
        let t = RationalTime::new(1, 30).unwrap();
        assert_eq!(fps.frame_index_floor(t).unwrap(), 1);
        assert_eq!(fps.frame_index_floor(RationalTime::new(0, 1).unwrap()).unwrap(), 0);
    }
}
