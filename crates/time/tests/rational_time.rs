use time::{FrameRate, RationalTime, TimeError};

#[test]
fn reduction_to_canonical_form() {
    assert_eq!(
        RationalTime::new(2, 4).unwrap(),
        RationalTime::new(1, 2).unwrap()
    );
}

#[test]
fn negative_denominator_normalization() {
    assert_eq!(
        RationalTime::new(-2, 4).unwrap(),
        RationalTime::new(-1, 2).unwrap()
    );
}

#[test]
fn zero_denominator_rejected() {
    assert_eq!(RationalTime::new(1, 0), Err(TimeError::ZeroDenominator));
}

#[test]
fn ntsc_frame_rate_round_trips_exactly() {
    let fps = FrameRate::new(30_000, 1001).unwrap();
    assert_eq!(fps.numer(), 30_000);
    assert_eq!(fps.denom(), 1001);
}

#[test]
fn film_frame_rate_round_trips_exactly() {
    let fps = FrameRate::new(24000, 1001).unwrap();
    assert_eq!(fps.numer(), 24000);
    assert_eq!(fps.denom(), 1001);
}

#[test]
fn add_sub_mul_exactness_and_overflow() {
    let a = RationalTime::new(1, 3).unwrap();
    let b = RationalTime::new(1, 6).unwrap();
    assert_eq!(a.add(b).unwrap(), RationalTime::new(1, 2).unwrap());
    assert_eq!(a.sub(b).unwrap(), RationalTime::new(1, 6).unwrap());
    assert_eq!(a.mul(2).unwrap(), RationalTime::new(2, 3).unwrap());

    let large = RationalTime::new(i64::MAX, 1).unwrap();
    assert_eq!(large.add(large), Err(TimeError::Overflow));
}

#[test]
fn frame_index_floor_for_known_fps() {
    let fps = FrameRate::new(24, 1).unwrap();
    let half_second = RationalTime::new(1, 2).unwrap();
    assert_eq!(fps.frame_index_floor(half_second).unwrap(), 12);

    let fps2997 = FrameRate::new(30000, 1001).unwrap();
    let one_second = RationalTime::new(1001, 1000).unwrap();
    assert_eq!(fps2997.frame_index_floor(one_second).unwrap(), 30);
}

#[test]
fn serialization_stability_fixture() {
    let json = r#"{"n":30000,"d":1001}"#;
    let t: RationalTime = serde_json::from_str(json).unwrap();
    assert_eq!(t, RationalTime::new(30000, 1001).unwrap());
}
