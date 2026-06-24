import { arch_stack } from './patterns/stack';
import { arch_stretcher } from './patterns/stretcher';
import { arch_herringbone } from './patterns/herringbone';
import { arch_flemish } from './patterns/flemish';
import { arch_common } from './patterns/common';
import { arch_chevron } from './patterns/chevron';
import { arch_staggered } from './patterns/staggered';
import { arch_ashlar } from './patterns/ashlar';
import { arch_cubic } from './patterns/cubic';
import { arch_hexagonal } from './patterns/hexagonal';
import { arch_basketweave } from './patterns/basketweave';
import { arch_hopscotch } from './patterns/hopscotch';
import { arch_diamond } from './patterns/diamond';
import { arch_circular } from './patterns/circular';
import { arch_fishscale } from './patterns/fishscale';
import { arch_french } from './patterns/french';
import { arch_none } from './patterns/none';
import { arch_rubble } from './patterns/rubble';
import { arch_drystone } from './patterns/drystone';
import { arch_coursed_ashlar } from './patterns/coursed_ashlar';
import { arch_mansion_weave } from './patterns/mansion_weave';
import { arch_european_fan } from './patterns/european_fan';
import { arch_houndstooth } from './patterns/houndstooth';
import { arch_windmill } from './patterns/windmill';
import { arch_hexagon_weave } from './patterns/hexagon_weave';
import { arch_plus } from './patterns/plus';
import { arch_plus_and_square } from './patterns/plus_and_square';
import { arch_swiss_cross } from './patterns/swiss_cross';
import { arch_swiss_cross_and_square } from './patterns/swiss_cross_and_square';
import { arch_triangle } from './patterns/triangle';
import { arch_triangle_chevron } from './patterns/triangle_chevron';
import { arch_triangle_diamond } from './patterns/triangle_diamond';
import { arch_isosceles } from './patterns/isosceles';
import { arch_staggered_isosceles } from './patterns/staggered_isosceles';
import { arch_compass } from './patterns/compass';
import { arch_octagon_star } from './patterns/octagon_star';
import { arch_octagon_square } from './patterns/octagon_square';
import { arch_intersecting_circle } from './patterns/intersecting_circle';
import { arch_hourglass } from './patterns/hourglass';
import { arch_alternating_fishscale } from './patterns/alternating_fishscale';
import { arch_ogee_fishscale } from './patterns/ogee_fishscale';
import { arch_hexagon_and_triangle } from './patterns/hexagon_and_triangle';
import { arch_star_and_hexagon } from './patterns/star_and_hexagon';
import { arch_star_and_cross } from './patterns/star_and_cross';
import { arch_chantilly } from './patterns/chantilly';
import { arch_versailles } from './patterns/versailles';
import { arch_haddon_hall } from './patterns/haddon_hall';
import { arch_double_herringbone } from './patterns/double_herringbone';
import { arch_triple_herringbone } from './patterns/triple_herringbone';
import { arch_45_chevron } from './patterns/45_chevron';
import { arch_crosshatch } from './patterns/crosshatch';
import { arch_ionian } from './patterns/ionian';
import { arch_rounded_rubble } from './patterns/rounded_rubble';
import { arch_corfiot } from './patterns/corfiot';
import { arch_variable_hexagon } from './patterns/variable_hexagon';
import { arch_varied_terrazzo } from './patterns/varied_terrazzo';
import { arch_consistent_width_terrazzo } from './patterns/consistent_width_terrazzo';
import { arch_varied_size_terrazzo } from './patterns/varied_size_terrazzo';
import { arch_rounded_rectangle_terrazzo } from './patterns/rounded_rectangle_terrazzo';
import { arch_leaf } from './patterns/leaf';
import { arch_diamond_weave } from './patterns/diamond_weave';
import { arch_angled_chevron } from './patterns/angled_chevron';
import { arch_true_chevron } from './patterns/true_chevron';
import { arch_diamond_in_diamond } from './patterns/diamond_in_diamond';
import { arch_trapeze } from './patterns/trapeze';
import { arch_paseo } from './patterns/paseo';
import { arch_unified_herringbone } from './patterns/unified_herringbone';
import { arch_arabesque_lantern } from './patterns/arabesque_lantern';
import { arch_arabesque_floral } from './patterns/arabesque_floral';
import { arch_four_leaf } from './patterns/four_leaf';
import { arch_half_hexagon } from './patterns/half_hexagon';
import { arch_picket_and_square } from './patterns/picket_and_square';
import { arch_interlocking_wave } from './patterns/interlocking_wave';
import { arch_angled_trapezoids } from './patterns/angled_trapezoids';
import { arch_trapezoid_triangle } from './patterns/trapezoid_triangle';
import { arch_bowtie_pavers } from './patterns/bowtie_pavers';
import { arch_kite } from './patterns/kite';
import { arch_scarpa } from './patterns/scarpa';
import { arch_zig_zag_pavers } from './patterns/zig_zag_pavers';
import { arch_double_stretcher } from './patterns/double_stretcher';
import { arch_double_chevron_diamond } from './patterns/double_chevron_diamond';
import { arch_chevron_diamond } from './patterns/chevron_diamond';
import { arch_propeller_pavers } from './patterns/propeller_pavers';
import { arch_tri_hex_pavers } from './patterns/tri_hex_pavers';
import { arch_v_pavers } from './patterns/v_pavers';
import { arch_crazy_paving } from './patterns/crazy_paving';
import { arch_triple_stretcher } from './patterns/triple_stretcher';
import { arch_single_basketweave } from './patterns/single_basketweave';
import { arch_t_vora } from './patterns/t_vora';
import { arch_1_4_running_bond } from './patterns/1_4_running_bond';
import { arch_1_3_running_bond } from './patterns/1_3_running_bond';
import { arch_double_stretcher_with_header } from './patterns/double_stretcher_with_header';
import { arch_interlocking_rectangle_pavers } from './patterns/interlocking_rectangle_pavers';
import { arch_interlocking_rectangle_with_square } from './patterns/interlocking_rectangle_with_square';
import { arch_double_flemish } from './patterns/double_flemish';
import { arch_1_3_stretcher } from './patterns/1_3_stretcher';
import { arch_1_4_stretcher } from './patterns/1_4_stretcher';
import { arch_6_point_intersecting_circle } from './patterns/6_point_intersecting_circle';
import { arch_broken_herringbone } from './patterns/broken_herringbone';
import { arch_snowflake } from './patterns/snowflake';
import { arch_cross_versailles } from './patterns/cross_versailles';
import { arch_pyramid_versailles } from './patterns/pyramid_versailles';
import { arch_cyclone_versailles } from './patterns/cyclone_versailles';
import { arch_diamond_continuous_versailles } from './patterns/diamond_continuous_versailles';
import { arch_framed_versailles } from './patterns/framed_versailles';
import { arch_random_bond } from './patterns/random_bond';
import { arch_triple_flemish } from './patterns/triple_flemish';
import { arch_gothic_bond } from './patterns/gothic_bond';
import { arch_silesian_bond } from './patterns/silesian_bond';
import { arch_monk_bond } from './patterns/monk_bond';
import { arch_english_bond } from './patterns/english_bond';
import { arch_venetian } from './patterns/venetian';
import { arch_banner } from './patterns/banner';
import { arch_cloud_weave } from './patterns/cloud_weave';
import { arch_trapeze_hex } from './patterns/trapeze_hex';
import { arch_parallelogram } from './patterns/parallelogram';
import { arch_triangle_square_mosaic } from './patterns/triangle_square_mosaic';
import { arch_petal_mosaic } from './patterns/petal_mosaic';
import { arch_octagon_picket } from './patterns/octagon_picket';
import { arch_uncoursed_ashlar } from './patterns/uncoursed_ashlar';
import { arch_broken_range_ashlar } from './patterns/broken_range_ashlar';
import { arch_three_piece_modular_paver } from './patterns/three_piece_modular_paver';
import { arch_four_piece_modular_paver } from './patterns/four_piece_modular_paver';
import { arch_octagram_mosaic } from './patterns/octagram_mosaic';
import { arch_star_mosaic } from './patterns/star_mosaic';
import { arch_6_point_star_mosaic } from './patterns/6_point_star_mosaic';
import { arch_hexagon_diamond } from './patterns/hexagon_diamond';
import { arch_diamond_square } from './patterns/diamond_square';
import { arch_diamond_cross } from './patterns/diamond_cross';
import { arch_double_basketweave } from './patterns/double_basketweave';
import { arch_double_zig_zag } from './patterns/double_zig_zag';
import { arch_varied_ashlar } from './patterns/varied_ashlar';
import { arch_rectangular_ashlar } from './patterns/rectangular_ashlar';
import { arch_crosshair } from './patterns/crosshair';
import { arch_60_chevron } from './patterns/60_chevron';
import { arch_wild_bond_dutch } from './patterns/wild_bond_dutch';
import { arch_kruis_bond_dutch } from './patterns/kruis_bond_dutch';
import { arch_basketweave_flow } from './patterns/basketweave_flow';
import { arch_basketweave_square } from './patterns/basketweave_square';
import { arch_cambridge_cobble } from './patterns/cambridge_cobble';
import { arch_diamond_point_mosaic } from './patterns/diamond_point_mosaic';
import { arch_double_linear_basketweave } from './patterns/double_linear_basketweave';
import { arch_linear_basketweave } from './patterns/linear_basketweave';
import { arch_oval_tiles } from './patterns/oval_tiles';
import { arch_portuguese_azulejo } from './patterns/portuguese_azulejo';
import { arch_separated_picket } from './patterns/separated_picket';
import { arch_single_basketweave_square } from './patterns/single_basketweave_square';
import { arch_star_pattern } from './patterns/star_pattern';
import { arch_stars_and_crosses } from './patterns/stars_and_crosses';
import { arch_turfstone_paver_2 } from './patterns/turfstone_paver_2';
import { arch_varied_basketweave } from './patterns/varied_basketweave';
import { arch_triangular_houndstooth } from './patterns/triangular_houndstooth';
import { arch_interlocking_polygons } from './patterns/interlocking_polygons';
import { arch_interlocking_v_pavers_hexagon } from './patterns/interlocking_v_pavers_hexagon';
import { arch_domino_paving } from './patterns/domino_paving';
import { arch_offset_checkered } from './patterns/offset_checkered';
import { arch_v_herringbone_varied } from './patterns/v_herringbone_varied';
import { arch_interlocking_triangular_pattern } from './patterns/interlocking_triangular_pattern';
import { arch_zig_zag_cross } from './patterns/zig_zag_cross';
import { arch_octagonal_tile_with_corner_squares } from './patterns/octagonal_tile_with_corner_squares';
import { arch_hexagon_and_dot } from './patterns/hexagon_and_dot';
import { arch_h_tiles } from './patterns/h_tiles';
import { arch_interlocking_pattern } from './patterns/interlocking_pattern';
import { arch_tumbling_blocks } from './patterns/tumbling_blocks';
import { arch_square_tile_with_circle_at_corner } from './patterns/square_tile_with_circle_at_corner';
import { arch_interlocking_rounded_tiles } from './patterns/interlocking_rounded_tiles';
import { arch_parallelogram_with_vertical_borders } from './patterns/parallelogram_with_vertical_borders';
import { arch_polygonal_parallelogram } from './patterns/polygonal_parallelogram';
import { arch_offset_parallelogram } from './patterns/offset_parallelogram';
import { arch_art_deco_tile_pattern_1 } from './patterns/art_deco_tile_pattern_1';
import { arch_art_deco_tile_pattern_2 } from './patterns/art_deco_tile_pattern_2';
import { arch_oval_tiles_interlocking_pattern } from './patterns/oval_tiles_interlocking_pattern';
import { arch_alternating_oval_tiles_interlocking_pattern } from './patterns/alternating_oval_tiles_interlocking_pattern';
import { arch_alternating_oval_tiles } from './patterns/alternating_oval_tiles';
import { arch_alternating_round_and_oval_tiles } from './patterns/alternating_round_and_oval_tiles';
import { arch_alternating_tile_weave } from './patterns/alternating_tile_weave';
import { arch_helix_tile_pattern } from './patterns/helix_tile_pattern';
import { arch_rotating_tile_pattern_2 } from './patterns/rotating_tile_pattern_2';
import { arch_geometric_mirrored_pattern } from './patterns/geometric_mirrored_pattern';
import { arch_rotating_tile_pattern_1 } from './patterns/rotating_tile_pattern_1';
import { arch_rectangular_weave_through_pattern } from './patterns/rectangular_weave_through_pattern';
import { arch_alternating_rounded_tiles } from './patterns/alternating_rounded_tiles';
import { arch_long_fish_scale_pattern } from './patterns/long_fish_scale_pattern';
import { arch_polygonal_interlocking_pattern } from './patterns/polygonal_interlocking_pattern';
import { arch_geometric_tile_pattern } from './patterns/geometric_tile_pattern';
import { arch_zellige_tile_pattern_1 } from './patterns/zellige_tile_pattern_1';
import { arch_zellige_tile_pattern_2 } from './patterns/zellige_tile_pattern_2';
import { arch_abstract_checkered_pattern } from './patterns/abstract_checkered_pattern';
import { arch_cross_tile_weave_pattern } from './patterns/cross_tile_weave_pattern';
import { arch_geometric_mosaic_pattern } from './patterns/geometric_mosaic_pattern';
import { arch_fishtail_roof_tile } from './patterns/fishtail_roof_tile';
import { arch_geometric_thin_tile_pattern } from './patterns/geometric_thin_tile_pattern';
import { arch_moroccan_geometric_tiles } from './patterns/moroccan_geometric_tiles';
import { arch_alternating_geometric_tile_pattern } from './patterns/alternating_geometric_tile_pattern';
import { arch_alternating_round_pattern } from './patterns/alternating_round_pattern';
import { arch_geometric_interlocking_pattern } from './patterns/geometric_interlocking_pattern';
import { arch_weaved_geometric_pattern } from './patterns/weaved_geometric_pattern';
import { arch_alternating_semi_circle_pattern } from './patterns/alternating_semi_circle_pattern';
import { arch_geometric_alternating_circles_pattern } from './patterns/geometric_alternating_circles_pattern';
import { arch_alternating_round_tiles } from './patterns/alternating_round_tiles';
import { arch_fishtail_roof_tiles_2 } from './patterns/fishtail_roof_tiles_2';
import { arch_wave_pattern_tiles } from './patterns/wave_pattern_tiles';
import { arch_alternating_interlocking_pattern_tile } from './patterns/alternating_interlocking_pattern_tile';
import { arch_alternating_striped_and_diagonal_tile_pattern } from './patterns/alternating_striped_and_diagonal_tile_pattern';
import { arch_alternating_tile_size_grid } from './patterns/alternating_tile_size_grid';
import { arch_alternating_tile_weave_2 } from './patterns/alternating_tile_weave_2';
import { arch_alternating_tile_weave_3 } from './patterns/alternating_tile_weave_3';
import { arch_alternating_cross_weave_tile_pattern } from './patterns/alternating_cross_weave_tile_pattern';
import { arch_diagonal_cross_pattern } from './patterns/diagonal_cross_pattern';
import { arch_diagonal_split_tile_pattern } from './patterns/diagonal_split_tile_pattern';
import { arch_diagonal_triangle_split_and_squared_tile_pattern } from './patterns/diagonal_triangle_split_and_squared_tile_pattern';
import { arch_diamond_square_mosaic } from './patterns/diamond_square_mosaic';
import { arch_double_linear_basketweave_2 } from './patterns/double_linear_basketweave_2';
import { arch_interlocking_stripe_pattern } from './patterns/interlocking_stripe_pattern';
import { arch_mazelike_pattern } from './patterns/mazelike_pattern';
import { arch_polygonal_mirrored_pattern } from './patterns/polygonal_mirrored_pattern';
import { arch_rhombus_split_tile } from './patterns/rhombus_split_tile';
import { arch_rounded_corner_alternating_tile_pattern } from './patterns/rounded_corner_alternating_tile_pattern';
import { arch_rounded_cross_pattern } from './patterns/rounded_cross_pattern';
import { arch_split_fishscale } from './patterns/split_fishscale';
import { arch_split_round_square_pattern } from './patterns/split_round_square_pattern';
import { arch_square_tile_with_triangle_corner_pattern } from './patterns/square_tile_with_triangle_corner_pattern';
import { arch_venetian_2 } from './patterns/venetian_2';
import { arch_wavy_tile_pattern } from './patterns/wavy_tile_pattern';
import { arch_alternating_square_and_split_tiles } from './patterns/alternating_square_and_split_tiles';
import { arch_alternating_tile_weave_4 } from './patterns/alternating_tile_weave_4';
import { arch_square_and_metro_tile_pattern } from './patterns/square_and_metro_tile_pattern';
import { arch_alternating_split_square_pattern } from './patterns/alternating_split_square_pattern';
import { arch_alternating_stripe_pattern } from './patterns/alternating_stripe_pattern';
import { arch_interlocking_stripe_pattern_2 } from './patterns/interlocking_stripe_pattern_2';
import { arch_patterned_edge_tile } from './patterns/patterned_edge_tile';
import { arch_split_rectangle_pattern } from './patterns/split_rectangle_pattern';
import { arch_split_square_pattern } from './patterns/split_square_pattern';
import { arch_varied_stripe_pattern_alternating } from './patterns/varied_stripe_pattern_alternating';
import { arch_varied_stripe_pattern } from './patterns/varied_stripe_pattern';
import { arch_playful_curved_tile_pattern } from './patterns/playful_curved_tile_pattern';
import { arch_geometric_alternating_pattern } from './patterns/geometric_alternating_pattern';
import { arch_fishtail_circles } from './patterns/fishtail_circles';
import { arch_interlocking_curved_tiles } from './patterns/interlocking_curved_tiles';
import { arch_split_checkered_pattern } from './patterns/split_checkered_pattern';
import { arch_wavy_pattern_with_split_tiles } from './patterns/wavy_pattern_with_split_tiles';
import { arch_wavy_rounded_tiles } from './patterns/wavy_rounded_tiles';
import { arch_patterned_tiles_variation } from './patterns/patterned_tiles_variation';
import { arch_curved_interlocking_tiles } from './patterns/curved_interlocking_tiles';
import { arch_cross_and_square_pattern } from './patterns/cross_and_square_pattern';
import { arch_checkerboard_split_pattern } from './patterns/checkerboard_split_pattern';
import { arch_checkered_stripe_tiles_variation } from './patterns/checkered_stripe_tiles_variation';
import { arch_checkered_tiles_variation } from './patterns/checkered_tiles_variation';
import { arch_crossing_split_tiles_pattern } from './patterns/crossing_split_tiles_pattern';
import { arch_geometric_compass_pattern } from './patterns/geometric_compass_pattern';
import { arch_long_rhombus_and_square_pattern } from './patterns/long_rhombus_and_square_pattern';
import { arch_mosaic_tile } from './patterns/mosaic_tile';
import { arch_star_and_cross_variation } from './patterns/star_and_cross_variation';
import { arch_star_and_square_variation } from './patterns/star_and_square_variation';
import { arch_triangle_split_tiles_variation } from './patterns/triangle_split_tiles_variation';
import { arch_wavy_triangle_pattern } from './patterns/wavy_triangle_pattern';
import { arch_zig_zag_alternating_tiles } from './patterns/zig_zag_alternating_tiles';
import { arch_alternating_square_and_split_tiles_2 } from './patterns/alternating_square_and_split_tiles_2';
import { arch_metro_tiles_with_interlocking_element } from './patterns/metro_tiles_with_interlocking_element';
import { arch_mirrored_caved_tiles } from './patterns/mirrored_caved_tiles';
import { arch_moroccan_geometric_tiles_2 } from './patterns/moroccan_geometric_tiles_2';
import { arch_rounded_edge_cross_pattern } from './patterns/rounded_edge_cross_pattern';
import { arch_spanish_antique_tile } from './patterns/spanish_antique_tile';
import { arch_star_and_cross_variation_2 } from './patterns/star_and_cross_variation_2';
import { arch_star_and_cross_variation_3 } from './patterns/star_and_cross_variation_3';
import { arch_zellige_tile_pattern_3 } from './patterns/zellige_tile_pattern_3';
import { arch_alternating_geometric_split_tile_pattern } from './patterns/alternating_geometric_split_tile_pattern';
import { arch_sculptural_diagonal_tile_pattern } from './patterns/sculptural_diagonal_tile_pattern';
import { arch_sculptural_triangle_and_circle_alternating_pattern } from './patterns/sculptural_triangle_and_circle_alternating_pattern';
import { arch_alternating_square_and_metro_tiles } from './patterns/alternating_square_and_metro_tiles';
import { arch_alternating_round_tile_pattern } from './patterns/alternating_round_tile_pattern';
import { arch_alternating_semicircle_split_tiles } from './patterns/alternating_semicircle_split_tiles';
import { arch_geometric_split_tiles } from './patterns/geometric_split_tiles';
import { arch_locked_square_pattern_1 } from './patterns/locked_square_pattern_1';
import { arch_mirrored_geometric_pattern_tile_2 } from './patterns/mirrored_geometric_pattern_tile_2';
import { arch_mirrored_geometric_pattern_tile } from './patterns/mirrored_geometric_pattern_tile';
import { arch_mirrored_sun_pattern } from './patterns/mirrored_sun_pattern';
import { arch_rounded_edge_tile_pattern } from './patterns/rounded_edge_tile_pattern';
import { arch_square_and_striped_tiles_variation } from './patterns/square_and_striped_tiles_variation';
import { arch_tangram_pattern } from './patterns/tangram_pattern';
import { arch_triangle_split_rectangle } from './patterns/triangle_split_rectangle';
import { arch_moroccan_geometric_tiles_3 } from './patterns/moroccan_geometric_tiles_3';
import { arch_diagonal_checkered_pattern } from './patterns/diagonal_checkered_pattern';
import { arch_split_square_pattern_2 } from './patterns/split_square_pattern_2';
import { arch_square_and_cross_pattern } from './patterns/square_and_cross_pattern';
import { arch_square_and_split_cross_pattern } from './patterns/square_and_split_cross_pattern';
import { arch_rectangle_split_pattern } from './patterns/rectangle_split_pattern';
import { arch_square_pattern_with_flower_element } from './patterns/square_pattern_with_flower_element';
import { arch_square_with_corner_element_grid } from './patterns/square_with_corner_element_grid';
import { arch_square_with_corner_element_random } from './patterns/square_with_corner_element_random';
import { arch_split_rectangle_pattern_2 } from './patterns/split_rectangle_pattern_2';
import { arch_locked_square_pattern_2 } from './patterns/locked_square_pattern_2';
import { arch_zellige_square_pattern } from './patterns/zellige_square_pattern';
import { arch_alternating_split_square_tile_pattern } from './patterns/alternating_split_square_tile_pattern';
import { arch_geometric_split_tile_pattern } from './patterns/geometric_split_tile_pattern';
import { arch_zellige_tile_pattern_4 } from './patterns/zellige_tile_pattern_4';
import { arch_square_and_a_half_pattern } from './patterns/square_and_a_half_pattern';
import { arch_aberdeen_bond } from './patterns/aberdeen_bond';
import { arch_kultura } from './patterns/kultura';


export const CATEGORIES = [...new Set(ARCHETYPES.flatMap(a => a.categories || []))].sort();



















































































































































export const ARCHETYPES = [
    arch_stack,
    arch_stretcher,
    arch_herringbone,
    arch_flemish,
    arch_common,
    arch_chevron,
    arch_staggered,
    arch_ashlar,
    arch_cubic,
    arch_hexagonal,
    arch_basketweave,
    arch_hopscotch,
    arch_diamond,
    arch_circular,
    arch_fishscale,
    arch_french,
    arch_none,
    arch_rubble,
    arch_drystone,
    arch_coursed_ashlar,
    arch_mansion_weave,
    arch_european_fan,
    arch_houndstooth,
    arch_windmill,
    arch_hexagon_weave,
    arch_plus,
    arch_plus_and_square,
    arch_swiss_cross,
    arch_swiss_cross_and_square,
    arch_triangle,
    arch_triangle_chevron,
    arch_triangle_diamond,
    arch_isosceles,
    arch_staggered_isosceles,
    arch_compass,
    arch_octagon_star,
    arch_octagon_square,
    arch_intersecting_circle,
    arch_hourglass,
    arch_alternating_fishscale,
    arch_ogee_fishscale,
    arch_hexagon_and_triangle,
    arch_star_and_hexagon,
    arch_star_and_cross,
    arch_chantilly,
    arch_versailles,
    arch_haddon_hall,
    arch_double_herringbone,
    arch_triple_herringbone,
    arch_45_chevron,
    arch_crosshatch,
    arch_ionian,
    arch_rounded_rubble,
    arch_corfiot,
    arch_variable_hexagon,
    arch_varied_terrazzo,
    arch_consistent_width_terrazzo,
    arch_varied_size_terrazzo,
    arch_rounded_rectangle_terrazzo,
    arch_leaf,
    arch_diamond_weave,
    arch_angled_chevron,
    arch_true_chevron,
    arch_diamond_in_diamond,
    arch_trapeze,
    arch_paseo,
    arch_unified_herringbone,
    arch_arabesque_lantern,
    arch_arabesque_floral,
    arch_four_leaf,
    arch_half_hexagon,
    arch_picket_and_square,
    arch_interlocking_wave,
    arch_angled_trapezoids,
    arch_trapezoid_triangle,
    arch_bowtie_pavers,
    arch_kite,
    arch_scarpa,
    arch_zig_zag_pavers,
    arch_double_stretcher,
    arch_double_chevron_diamond,
    arch_chevron_diamond,
    arch_propeller_pavers,
    arch_tri_hex_pavers,
    arch_v_pavers,
    arch_crazy_paving,
    arch_triple_stretcher,
    arch_single_basketweave,
    arch_t_vora,
    arch_1_4_running_bond,
    arch_1_3_running_bond,
    arch_double_stretcher_with_header,
    arch_interlocking_rectangle_pavers,
    arch_interlocking_rectangle_with_square,
    arch_double_flemish,
    arch_1_3_stretcher,
    arch_1_4_stretcher,
    arch_6_point_intersecting_circle,
    arch_broken_herringbone,
    arch_snowflake,
    arch_cross_versailles,
    arch_pyramid_versailles,
    arch_cyclone_versailles,
    arch_diamond_continuous_versailles,
    arch_framed_versailles,
    arch_random_bond,
    arch_triple_flemish,
    arch_gothic_bond,
    arch_silesian_bond,
    arch_monk_bond,
    arch_english_bond,
    arch_venetian,
    arch_banner,
    arch_cloud_weave,
    arch_trapeze_hex,
    arch_parallelogram,
    arch_triangle_square_mosaic,
    arch_petal_mosaic,
    arch_octagon_picket,
    arch_uncoursed_ashlar,
    arch_broken_range_ashlar,
    arch_three_piece_modular_paver,
    arch_four_piece_modular_paver,
    arch_octagram_mosaic,
    arch_star_mosaic,
    arch_6_point_star_mosaic,
    arch_hexagon_diamond,
    arch_diamond_square,
    arch_diamond_cross,
    arch_double_basketweave,
    arch_double_zig_zag,
    arch_varied_ashlar,
    arch_rectangular_ashlar,
    arch_crosshair,
    arch_60_chevron,
    arch_wild_bond_dutch,
    arch_kruis_bond_dutch,
    arch_basketweave_flow,
    arch_basketweave_square,
    arch_cambridge_cobble,
    arch_diamond_point_mosaic,
    arch_double_linear_basketweave,
    arch_linear_basketweave,
    arch_oval_tiles,
    arch_portuguese_azulejo,
    arch_separated_picket,
    arch_single_basketweave_square,
    arch_star_pattern,
    arch_stars_and_crosses,
    arch_turfstone_paver_2,
    arch_varied_basketweave,
    arch_triangular_houndstooth,
    arch_interlocking_polygons,
    arch_interlocking_v_pavers_hexagon,
    arch_domino_paving,
    arch_offset_checkered,
    arch_v_herringbone_varied,
    arch_interlocking_triangular_pattern,
    arch_zig_zag_cross,
    arch_octagonal_tile_with_corner_squares,
    arch_hexagon_and_dot,
    arch_h_tiles,
    arch_interlocking_pattern,
    arch_tumbling_blocks,
    arch_square_tile_with_circle_at_corner,
    arch_interlocking_rounded_tiles,
    arch_parallelogram_with_vertical_borders,
    arch_polygonal_parallelogram,
    arch_offset_parallelogram,
    arch_art_deco_tile_pattern_1,
    arch_art_deco_tile_pattern_2,
    arch_oval_tiles_interlocking_pattern,
    arch_alternating_oval_tiles_interlocking_pattern,
    arch_alternating_oval_tiles,
    arch_alternating_round_and_oval_tiles,
    arch_alternating_tile_weave,
    arch_helix_tile_pattern,
    arch_rotating_tile_pattern_2,
    arch_geometric_mirrored_pattern,
    arch_rotating_tile_pattern_1,
    arch_rectangular_weave_through_pattern,
    arch_alternating_rounded_tiles,
    arch_long_fish_scale_pattern,
    arch_polygonal_interlocking_pattern,
    arch_geometric_tile_pattern,
    arch_zellige_tile_pattern_1,
    arch_zellige_tile_pattern_2,
    arch_abstract_checkered_pattern,
    arch_cross_tile_weave_pattern,
    arch_geometric_mosaic_pattern,
    arch_fishtail_roof_tile,
    arch_geometric_thin_tile_pattern,
    arch_moroccan_geometric_tiles,
    arch_alternating_geometric_tile_pattern,
    arch_alternating_round_pattern,
    arch_geometric_interlocking_pattern,
    arch_weaved_geometric_pattern,
    arch_alternating_semi_circle_pattern,
    arch_geometric_alternating_circles_pattern,
    arch_alternating_round_tiles,
    arch_fishtail_roof_tiles_2,
    arch_wave_pattern_tiles,
    arch_alternating_interlocking_pattern_tile,
    arch_alternating_striped_and_diagonal_tile_pattern,
    arch_alternating_tile_size_grid,
    arch_alternating_tile_weave_2,
    arch_alternating_tile_weave_3,
    arch_alternating_cross_weave_tile_pattern,
    arch_diagonal_cross_pattern,
    arch_diagonal_split_tile_pattern,
    arch_diagonal_triangle_split_and_squared_tile_pattern,
    arch_diamond_square_mosaic,
    arch_double_linear_basketweave_2,
    arch_interlocking_stripe_pattern,
    arch_mazelike_pattern,
    arch_polygonal_mirrored_pattern,
    arch_rhombus_split_tile,
    arch_rounded_corner_alternating_tile_pattern,
    arch_rounded_cross_pattern,
    arch_split_fishscale,
    arch_split_round_square_pattern,
    arch_square_tile_with_triangle_corner_pattern,
    arch_venetian_2,
    arch_wavy_tile_pattern,
    arch_alternating_square_and_split_tiles,
    arch_alternating_tile_weave_4,
    arch_square_and_metro_tile_pattern,
    arch_alternating_split_square_pattern,
    arch_alternating_stripe_pattern,
    arch_interlocking_stripe_pattern_2,
    arch_patterned_edge_tile,
    arch_split_rectangle_pattern,
    arch_split_square_pattern,
    arch_varied_stripe_pattern_alternating,
    arch_varied_stripe_pattern,
    arch_playful_curved_tile_pattern,
    arch_geometric_alternating_pattern,
    arch_fishtail_circles,
    arch_interlocking_curved_tiles,
    arch_split_checkered_pattern,
    arch_wavy_pattern_with_split_tiles,
    arch_wavy_rounded_tiles,
    arch_patterned_tiles_variation,
    arch_curved_interlocking_tiles,
    arch_cross_and_square_pattern,
    arch_checkerboard_split_pattern,
    arch_checkered_stripe_tiles_variation,
    arch_checkered_tiles_variation,
    arch_crossing_split_tiles_pattern,
    arch_geometric_compass_pattern,
    arch_long_rhombus_and_square_pattern,
    arch_mosaic_tile,
    arch_star_and_cross_variation,
    arch_star_and_square_variation,
    arch_triangle_split_tiles_variation,
    arch_wavy_triangle_pattern,
    arch_zig_zag_alternating_tiles,
    arch_alternating_square_and_split_tiles_2,
    arch_metro_tiles_with_interlocking_element,
    arch_mirrored_caved_tiles,
    arch_moroccan_geometric_tiles_2,
    arch_rounded_edge_cross_pattern,
    arch_spanish_antique_tile,
    arch_star_and_cross_variation_2,
    arch_star_and_cross_variation_3,
    arch_zellige_tile_pattern_3,
    arch_alternating_geometric_split_tile_pattern,
    arch_sculptural_diagonal_tile_pattern,
    arch_sculptural_triangle_and_circle_alternating_pattern,
    arch_alternating_square_and_metro_tiles,
    arch_alternating_round_tile_pattern,
    arch_alternating_semicircle_split_tiles,
    arch_geometric_split_tiles,
    arch_locked_square_pattern_1,
    arch_mirrored_geometric_pattern_tile_2,
    arch_mirrored_geometric_pattern_tile,
    arch_mirrored_sun_pattern,
    arch_rounded_edge_tile_pattern,
    arch_square_and_striped_tiles_variation,
    arch_tangram_pattern,
    arch_triangle_split_rectangle,
    arch_moroccan_geometric_tiles_3,
    arch_diagonal_checkered_pattern,
    arch_split_square_pattern_2,
    arch_square_and_cross_pattern,
    arch_square_and_split_cross_pattern,
    arch_rectangle_split_pattern,
    arch_square_pattern_with_flower_element,
    arch_square_with_corner_element_grid,
    arch_square_with_corner_element_random,
    arch_split_rectangle_pattern_2,
    arch_locked_square_pattern_2,
    arch_zellige_square_pattern,
    arch_alternating_split_square_tile_pattern,
    arch_geometric_split_tile_pattern,
    arch_zellige_tile_pattern_4,
    arch_square_and_a_half_pattern,
    arch_aberdeen_bond,
    arch_kultura,
];

export const ARCHETYPE_DESCRIPTIONS = {
  line: 'Líneas paralelas simples con espaciado uniforme.',
  net: 'Rejilla ortogonal de cuadros perfectos.',
  weave: 'Cinta entrelazada simulando un tejido tradicional.',
  chevron: 'Patrón de zig-zag continuo, ideal para pisos y parquets.',
  common: 'Aparejo común: 5 hiladas en soga (largo) por 1 hilada en tizón (ancho).',
  cubic: 'Cuadrícula base.',
  cubic3d: 'Patrón de cubos isométricos 3D apilados.',
  flemish: 'Aparejo flamenco: alterna soga y tizón en la misma hilada.',
  herringbone: 'Aparejo en espiga o hueso de pez a 45 grados.',
  stack: 'Aparejo apilado, las juntas coinciden perfectamente alineadas.',
  stretcher: 'Aparejo en soga tradicional desfasado a la mitad.',
  english_bond: 'Aparejo inglés: alterna una hilada completa de soga con una completa de tizón.',
  '13_running_bond': 'Ladrillos en soga desfasados un tercio (1/3) de su longitud.',
  '14_running_bond': 'Ladrillos en soga desfasados un cuarto (1/4) de su longitud.',
  double_stretcher: 'Dos hiladas de sogas alineadas, seguidas de dos hiladas desfasadas a la mitad.',
  triple_stretcher: 'Tres hiladas de sogas alineadas, seguidas de tres hiladas desfasadas a la mitad.',
  monk_bond: 'Aparejo de los monjes: alterna dos sogas y un tizón por cada hilada. Se usaba mucho en iglesias medievales.',
  silesian_bond: 'Aparejo silesiano: alterna tres sogas y un tizón por hilada.',
  basketweave: 'Patrón de cesta o trenzado de pares de ladrillos ortogonales.',
  hexagonal: 'Mosaico de panal de abejas. Formado por hexágonos regulares perfectos.',
  octagon_square: 'Clásico mosaico victoriano: octágonos regulares conectados por pequeños cuadrados insertados.',
  double_flemish: 'Aparejo flamenco doble: alterna dos sogas y un tizón centrando este último sobre las sogas.',
  triple_flemish: 'Aparejo flamenco triple: alterna tres sogas y un tizón.',
  gothic_bond: 'Aparejo gótico: alterna soga y tizón en cada hilada con un desfase particular.',
  english_cross_bond: 'Aparejo cruzado inglés: filas puras de soga y tizón, alternadas, con desfase en las sogas.',
  double_herringbone: 'Doble espiga a 45 grados: bloques de dos ladrillos colocados en zigzag.',
  triple_herringbone: 'Triple espiga a 45 grados: bloques de tres ladrillos colocados en zigzag.',
  diamond: 'Retícula de rombos continuos formados por líneas cruzadas a 45 grados.',
  triangle: 'Triángulos equiláteros perfectos mediante grilla tricruzada.',
  windmill: 'Parquet de molino de viento: cuatro ladrillos rectangulares rotando sobre un cuadrado central.',
  hopscotch: 'Rayuela: patrón combinando un cuadrado grande y uno pequeño en una cuadrícula continua.',
};

export const generatePatternName = (archetype, w, h, j) => {
  const hasJoint = archetype.controls.includes('joint') && j > 0;
  if (archetype.controlsType === 'cubic' || archetype.controlsType === 'lines') {
    if (hasJoint) return `${archetype.id}_${w}_j${j}`;
    return `${archetype.id}_${w}`;
  }
  if (hasJoint) return `${archetype.id}_${w}x${h}_j${j}`;
  return `${archetype.id}_${w}x${h}`;
};
